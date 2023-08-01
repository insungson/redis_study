import { client } from '$services/redis';
import { itemsKey, itemsByViewsKey, itemsViewsKey } from '$services/keys';

export const incrementView = async (itemId: string, userId: string) => {
	const inserted = await client.pfAdd(itemsViewsKey(itemId), userId);
	// items:views#${itemId}  에 대해 userId 를 추가한다!!

	// 위의 inserted 에서 1로 리턴을 줄 경우에만 views 의 카운트를 증가시킨다!!
	if (inserted) {
	// 아래와 같이 pipeline 처리
	return Promise.all([
		// 기존 hash에 views 항목 1추가
		client.hIncrBy(itemsKey(itemId), 'views', 1),
		// sorted set 에서 해당 상품 1 추가
		client.zIncrBy(itemsByViewsKey(), 1, itemId)
	]);
	}

};
