import type { CreateItemAttrs } from '$services/types';
import { client } from '$services/redis';
import { serialize } from './serialize';
import { genId } from '$services/utils';
import { itemsKey, itemsByViewsKey, itemsByEndingAtKey } from '$services/keys';
import { deserialize } from './deserialize';

export const getItem = async (id: string) => {
	const item = await client.hGetAll(itemsKey(id));

	if (Object.keys(item).length === 0) {
		return null;
	}

	return deserialize(id, item);
};

export const getItems = async (ids: string[]) => {
	const commands = ids.map((id) => {
		return client.hGetAll(itemsKey(id));
	});

	const results = await Promise.all(commands);

	return results.map((result, i) => {
		if (Object.keys(result).length === 0) {
			return null;
		}

		return deserialize(ids[i], result);
	});
};

export const createItem = async (attrs: CreateItemAttrs) => {
	const id = genId();

	const serialized = serialize(attrs);

	// 아래 로직은 hSet() 이 복수 속성추가가 안되어 pipeline 적용이 어렵지만..
	const keys = Object.keys(serialized);
	keys.forEach(async (key) => {
		await client.hSet(itemsKey(id), { [key]: serialized[key] });
	});

	// 아래의 상품 생성시 views, endingAt 의 Sorted Set 은 pipeline 처리가 가능하다
	await Promise.all([
		// 상품 생성시 view 에 대한 Sorted Set 설정
		client.zAdd(itemsByViewsKey(), { value: id, score: 0 }),
		// 상품 생성시 endingAt 에 대한 Sorted Set 설정
		client.zAdd(itemsByEndingAtKey(), { value: id, score: attrs.endingAt.toMillis() })
		// (시간은 toMillis() 를 통해 number 로 변환해준다)
	]);

	return id;
};
