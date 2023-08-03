import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey, itemsKey } from '$services/keys';
import { client } from '$services/redis';
import { DateTime } from 'luxon';
import { getItem } from './items';

export const createBid = async (attrs: CreateBidAttrs) => {

	// 해당 상품 biding 시 진행하는 유효성 검사 3가지! 
	const item = await getItem(attrs.itemId); // 상품의 정보(hash)를 전부 가져온다.

	if (!item) { // 1) 상품정보 (hash) 가 있는지 체크!
		throw new Error('Item does not exist');
	}
	if (item.price >= attrs.amount) { // 2) 해당 상품의 biding 가격이 현 상품의 가격보다 낮은지 체크!
		throw new Error('Bid too low');
	}
	if (item.endingAt.diff(DateTime.now()).toMillis() < 0) { // 3) 상품 biding 시 형 상품의 시간이 끝난지 체크!
		throw new Error('Item closed to bidding');
	}

	const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());
	
	return Promise.all([
		client.rPush(bidHistoryKey(attrs.itemId), serialized),
		client.hSet(itemsKey(item.id), {
			bids: item.bids + 1,
			price: attrs.amount,
			highestBidUserId: attrs.userId
		})
	]);
	// return client.rPush(bidHistoryKey(attrs.itemId), serialized);
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
