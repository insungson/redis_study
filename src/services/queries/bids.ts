import type { CreateBidAttrs, Bid } from '$services/types';
import { bidHistoryKey } from '$services/keys';
import { client } from '$services/redis';
import { DateTime } from 'luxon';

export const createBid = async (attrs: CreateBidAttrs) => {
	const serialized = serializeHistory(attrs.amount, attrs.createdAt.toMillis());

	return client.rPush(bidHistoryKey(attrs.itemId), serialized);
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
