import { client } from '$services/redis';
import { itemsKey, itemsByViewsKey } from '$services/keys';

export const incrementView = async (itemId: string, userId: string) => {
	// 아래와 같이 pipeline 처리
	return Promise.all([
		// 기존 hash에 views 항목 1추가
		client.hIncrBy(itemsKey(itemId), 'views', 1),
		// sorted set 에서 해당 상품 1 추가
		client.zIncrBy(itemsByViewsKey(), 1, itemId)
	]);
};
