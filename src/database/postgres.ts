import 'dotenv/config'
import { Sequelize } from '@sequelize/core';

const sequelize = new Sequelize(
  process.env.POSTGRES_DB as string,
  process.env.POSTGRES_USER as string,
  process.env.POSTGRES_PASSWORD as string,
  {
    dialect: 'postgres',
    host: 'localhost',
    port: process.env.POSTGRES_PORT as string,
    logging: false,
    // Your pg options here
    dialectOptions: {},
  }
);

export default sequelize;