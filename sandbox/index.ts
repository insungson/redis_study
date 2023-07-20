import 'dotenv/config';
import { client } from '../src/services/redis';

const run = async () => {
	// // hset, hgetall 관련 코드
	// await client.hSet('car', 'color', 'red');
	// await client.hSet('car', 'year', 1950);
	// await client.hSet('car', { country: 'korea' });
	// await client.hSet('car', { rival: null || '' });
	// await client.hSet('car', { type: '' });
	// await client.hSet('car', { fuel: undefined || '' });
	// // await client.hSet('car', { rival: { country: 'japan' } });
	// // await client.hSet('car', { rival: 'japan', attacked: 4 });

	// const car = await client.hGetAll('car');
	// const user = await client.hGetAll('user');

	// if (Object.keys(user).length === 0) {
	// 	console.log('user not found, respond with 404');
	// 	return;
	// }

	// console.log(car);
	// console.log('user: ', user);

	// pipeline 관련 코드
	await client.hSet('car1', { color: 'red' });
	await client.hSet('car1', { year: 1950 });
	await client.hSet('car2', { color: 'green' });
	await client.hSet('car2', { year: 1955 });
	await client.hSet('car3', { color: 'blue' });
	await client.hSet('car3', { year: 1960 });

	// // 아래의 방법이 1개씩 처리하는것..
	// const results = await Promise.all([
	// 	client.hGetAll('car1'),
	// 	client.hGetAll('car2'),
	// 	client.hGetAll('car3')
	// ]);

	const commands = [1, 2, 3].map((id) => {
		return client.hGetAll('car' + id);
	});

	const results = await Promise.all(commands);

	console.log('results: ', results);
};
run();
