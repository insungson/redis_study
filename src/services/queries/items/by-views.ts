import { client } from '$services/redis';
import { itemsKey, itemsByViewsKey } from '$services/keys';
import { deserialize } from './deserialize';

export const itemsByViews = async (order: 'DESC' | 'ASC' = 'DESC', offset = 0, count = 10) => {
    let results: any = await client.sort(itemsByViewsKey(), {
        GET: [
            '#',
            `${itemsKey('*')}->name`,
            `${itemsKey('*')}->views`,
            `${itemsKey('*')}->endingAt`,
            `${itemsKey('*')}->imageUrl`,
            `${itemsKey('*')}->price`,
        ],
        BY: 'nosort',
        DIRECTION: order,
        LIMIT: {offset, count}
    });

    const items = [];
    while (results.length) {
        // console.log('results123: ', results);
		const [id, name, views, endingAt, imageUrl, price, ...rest] = results;
		const item = deserialize(id, { name, views, endingAt, imageUrl, price });
		items.push(item);
		results = rest;
    }

    return items;
};
// 위의 sort 로 나온 결과는 아래와 같다.. 
// sort 로 가져오는 속성이 정해져 있으므로 
// while (results.length) {  //results 로 계속 돌리고
//     console.log('results123: ', results); 
//     const [id, name, views, endingAt, imageUrl, price, ...rest] = results; // sort 의 결과로 나온 배열을 앞에서 짤라서
//     const item = deserialize(id, { name, views, endingAt, imageUrl, price }); // deserialize 를 통해 객체를 넣고
//     items.push(item);
//     results = rest;  // 여기서 rest 로 앞에서 나머지 짜른 부분을 넣어서 다시 맨위의 while 문이 실행된다!
// }
// // 아래의 로그 기록을 보면 전체 배열에서 점점 줄어드는것을 확인할 수 있다!!

// results123:  [
//     'b43ca1',
//     'Chair1',
//     '4',
//     '1690502620951',
//     'https://realrealreal-redis.s3.amazonaws.com/133.jpg',
//     '0',
//     'd2d7a8',
//     'Chair2',
//     '3',
//     '1690502628709',
//     'https://realrealreal-redis.s3.amazonaws.com/19.jpg',
//     '0',
//     'e4bc2f',
//     'Chair',
//     '1',
//     '1690502072691',
//     'https://realrealreal-redis.s3.amazonaws.com/137.jpg',
//     '0'
//   ]
//   results123:  [
//     'd2d7a8',
//     'Chair2',
//     '3',
//     '1690502628709',
//     'https://realrealreal-redis.s3.amazonaws.com/19.jpg',
//     '0',
//     'e4bc2f',
//     'Chair',
//     '1',
//     '1690502072691',
//     'https://realrealreal-redis.s3.amazonaws.com/137.jpg',
//     '0'
//   ]
//   results123:  [
//     'e4bc2f',
//     'Chair',
//     '1',
//     '1690502072691',
//     'https://realrealreal-redis.s3.amazonaws.com/137.jpg',
//     '0'
//   ]