import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey, itemsKey, itemsByPriceKey } from '$services/keys';
import { client, withLock } from '$services/redis';
import { DateTime } from 'luxon';
import { getItem } from './items';

export const createBid = async (attrs: CreateBidAttrs) => {
	return withLock(attrs.itemId, async (lockedClient: typeof client, signal: any) => {
		// 1) Fetching the item
		// 2) Doing validation
		// 3) Writing some data
		const item = await getItem(attrs.itemId);

		if (!item) {
			throw new Error('Item does not exist');
		}
		if (item.price >= attrs.amount) {
			throw new Error('Bid too low');
		}
		if (item.endingAt.diff(DateTime.now()).toMillis() < 0) {
			throw new Error('Item closed to bidding');
		}

		const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

		if (signal.expired) {
			throw new Error('Lock expired, cant write any more data');
		}

		// lock에 의해 concurrency(동시성 문제)를 처리하기 때문에... 
		// 여기선 multi 를 사용할 필요가 없다...
		// 한번에 처리를 위한 pipeline 을 사용한다
		return Promise.all([
			lockedClient.rPush(bidHistoryKey(attrs.itemId), serialized),
			lockedClient.hSet(itemsKey(item.id), {
				bids: item.bids + 1,
				price: attrs.amount,
				highestBidUserId: attrs.userId
			}),
			lockedClient.zAdd(itemsByPriceKey(), {
				value: item.id,
				score: attrs.amount
			})
		]);
	});

	// // lock 처리하기 전 로직...
	// return client.executeIsolated(async (isolatedClient) => { // transaction 을 위한 new client 를 만들기 위한 객체이다.
	// 	await isolatedClient.watch(itemsKey(attrs.itemId)); //여기서 watch 로 상품의 키를 설정해준다.
	// 	// watch로 설정된 키의 값이 변경된다면 다음 키에 대한 값 변경은 자동으로 실패처리를 한다.
	// 	// (뒷단에선 최소 설정된 key로 값이 변경된다면 redis 내부에서 인식하는 hash 키가 변경하게 된다.. 코드로 보면 같음..)
	// 	// (그래서 1회만 실행되고 2회부턴 실패처리를 할 수 있는 것이다...)
	// 		// 해당 상품 biding 시 진행하는 유효성 검사 3가지! 
	// 		const item = await getItem(attrs.itemId); // 상품의 정보(hash)를 전부 가져온다.

	// 		if (!item) { // 1) 상품정보 (hash) 가 있는지 체크!
	// 			throw new Error('Item does not exist');
	// 		}
	// 		if (item.price >= attrs.amount) { // 2) 해당 상품의 biding 가격이 현 상품의 가격보다 낮은지 체크!
	// 			throw new Error('Bid too low');
	// 		}
	// 		if (item.endingAt.diff(DateTime.now()).toMillis() < 0) { // 3) 상품 biding 시 형 상품의 시간이 끝난지 체크!
	// 			throw new Error('Item closed to bidding');
	// 		}

	// 		const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

	// 		// 세번째 동시처리를 하지만... transaction 처리까지 함
	// 		return isolatedClient
	// 			.multi()
	// 			.rPush(bidHistoryKey(attrs.itemId), serialized)
	// 			.hSet(itemsKey(item.id), {
	// 				bids: item.bids + 1,
	// 				price: attrs.amount,
	// 				highestBidUserId: attrs.userId
	// 			})
	// 			.zAdd(itemsByPriceKey(), {// biding 이후 상품에 대한 biding 가격 정렬을 위한 Sorted Set 업데이트 반영!
	// 				value: item.id,
	// 				score: attrs.amount,
	// 			})
	// 			.exec();
	// });


	// // 두번째 biding history 와 itemd 의 hash 값 업데이트 동시처리.. 
	// return Promise.all([
	// 	client.rPush(bidHistoryKey(attrs.itemId), serialized),
	// 	client.hSet(itemsKey(item.id), {
	// 		bids: item.bids + 1,
	// 		price: attrs.amount,
	// 		highestBidUserId: attrs.userId
	// 	})
	// ]);
	// // 첫번째(최초) biding 값에 대한 history 만 생각할때 아래의 것만 사용.
	// // return client.rPush(bidHistoryKey(attrs.itemId), serialized);
};

export const getBidHistory = async (itemId: string, offset = 0, count = 10): Promise<Bid[]> => {
	// 뒤에서부터 보여줘야 하기 떄문에.. 아래와 같이 시작은 -1 로 계산해서 처리해야 한다.
	const startIndex = -1 * offset - count;
	const endIndex = -1 - offset;

	const range = await client.lRange(bidHistoryKey(itemId), startIndex, endIndex);

	return range.map((bid) => deserializeHistory(bid));
};

// 가격:시간  을 만들어주는 serialize 함수이다.
const serializeHistory = (amount: number, createdAt: number) => {
	return `${amount}:${createdAt}`;
};

// 저장된 가격:시간  -> 데이터로 변경해주는 deserialize 함수이다.
const deserializeHistory = (stored: string) => {
	const [amount, createdAt] = stored.split(':');

	return {
		amount: parseFloat(amount),
		createdAt: DateTime.fromMillis(parseInt(createdAt))
	};
};
