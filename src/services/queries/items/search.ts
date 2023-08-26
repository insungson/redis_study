import { client } from '$services/redis';
import { deserialize } from './deserialize';
import { itemsIndexKey } from '$services/keys';

// 아래의 첫번째 인자는 검색어,
// 둡번째 인자는 검색할 갯수이다.
export const searchItems = async (term: string, size: number = 5) => {
	const cleaned = term
		.replaceAll(/[^a-zA-Z0-9 ]/g, '') 
		// #$%!@ 이런 이상한 문자들을 제거하는 regex 구문이다. 소문자, 대문자, 숫자를 제외한 나머지 문자 ''로 변환처리
		.trim() //맨 앞과 맨뒤의 빈칸을 제거한다
		.split(' ') // 빈칸으로 단어를 구분한다
		.map((word) => (word ? `%${word}%` : '')) //여기서 사용하는 것은 Fuzzy search 이다
		.join(' ');

	// step1: Look at cleaned and make sure it is valid
	// step1: 위의 과정을 통해 딱히 검색할 단어가 없다면 처리를 안한다
	if (cleaned === '') {
		return [];
	}

	// 아래와 같이 해당 키(상품명에 5배의 가중치를주고 설명도 검색하는 쿼리를 넣는다)
	const query = `(@name:(${cleaned}) => { $weight: 5.0 }) | (@description:(${cleaned}))`;

	// step2: Use the client to do an actual search
	// step2: create-indexes 에서 만든 search index 를 사용하여 검색을 한다!!
	const results = await client.ft.search(itemsIndexKey(), query, {
		LIMIT: {
			from: 0,
			size // 위에서 가져올 갯수를 설정한다.
		}
	});

	// step3: Deserialize and return the search results
	// step3: 가져온 결과를 웹에서 보기 편한 형태로 변환(deserialize) 처리한다!
	return results.documents.map(({ id, value }) => deserialize(id, value as any));
};