import dataSource from '@config/typeorm.config';

async function runSeed() {
  await dataSource.initialize();

  console.log('Seeding database...');

  // Add your seed data here
  // Example:
  // const tenantRepository = dataSource.getRepository(Tenant);
  // await tenantRepository.save({
  //   name: 'Default Tenant',
  //   code: 'default',
  //   description: 'Default tenant for testing',
  // });

  console.log('Seeding completed!');

  await dataSource.destroy();
}

runSeed().catch((error) => {
  console.error('Error during seeding:', error);
  process.exit(1);
});
