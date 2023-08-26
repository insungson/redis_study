import { SchemaFieldTypes } from 'redis'; //index의 필드 타입 설정을 도와준다
import { client } from './client';
import { itemsIndexKey, itemsKey } from '$services/keys';

export const createIndexes = async () => {
	const indexes = await client.ft._list(); // 여기서 FT._LIST 명령어를 통해 현재 만들어진 index 리스트를 가져온다
	const exists = indexes.find((index) => index === itemsIndexKey());
	// 위의 로직으로 사용할 인덱스가 이미 create되었는지 확인한다! 

	//이미 만들어 졌으면 그냥 아무엇도 안하고.
	if (exists) {
		return;
	}
	// 없다면 아래와 같이 해당 index 를 만들면 된다
	// 아래와 같이 클라이언트를 호출하여 사용한다.
	return client.ft.create(
		itemsIndexKey(), // 키 설정을 한다
		{ // hash 의 키와 타입으 설정한다.
			name: {
				type: SchemaFieldTypes.TEXT,
				sortable: true
			},
			description: {
				type: SchemaFieldTypes.TEXT,
				sortable: false
			},
			ownerId: {
				type: SchemaFieldTypes.TAG,
				sortable: false
			},
			endingAt: {
				type: SchemaFieldTypes.NUMERIC,
				sortable: true
			},
			bids: {
				type: SchemaFieldTypes.NUMERIC,
				sortable: true
			},
			views: {
				type: SchemaFieldTypes.NUMERIC,
				sortable: true
			},
			price: {
				type: SchemaFieldTypes.NUMERIC,
				sortable: true
			},
			likes: {
				type: SchemaFieldTypes.NUMERIC,
				sortable: true
			}
		} as any,
		{ // 추가옵션에 대해 설정해준다
			ON: 'HASH', // HASH, JSON 이 있다..
			PREFIX: itemsKey('') // 상품에서 검색을 하기 때문에 상품의 키를 prefix로 설정한다
		}
        	);
};