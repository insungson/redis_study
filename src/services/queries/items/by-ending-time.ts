import { client } from '$services/redis';
import { itemsKey, itemsByEndingAtKey } from '$services/keys';
import { deserialize } from './deserialize';

function addHours(hours) {
	// 👇 Make copy with "Date" constructor.
	const dateCopy = new Date();

	dateCopy.setHours(dateCopy.getHours() + hours);

	return dateCopy;
}

// 상품 만료일 정렬 되어 보여주는 함수
export const itemsByEndingTime = async (order: 'DESC' | 'ASC' = 'DESC', offset = 0, count = 10) => {
	console.log(addHours(2).getTime());
	const ids = await client.zRange(itemsByEndingAtKey(), Date.now(), addHours(2).getTime(), {
		BY: 'SCORE',
		LIMIT: {
			offset,
			count
		}
	});

	console.log('ids: ', ids);
};
