import '@shopify/shopify-api/adapters/node';
import express, { Express, Request, Response } from "express";
import CompaniesRouter from './companies/routes';
import CustomersRouter from './customers/routes';
import companySyncJob from './cronjob/companies';
import customerSyncJob from './cronjob/customer';
import sequelize from './database/postgres';
import logger from './winston.config';

const dotenv = require('dotenv');
const cors = require('cors')
const helmet = require('helmet')


dotenv.config();

const app: Express = express();
const port = process.env.PORT;

app.use(cors())
app.use(helmet())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const v1Router = express.Router();
v1Router.use('/customers', CustomersRouter)
v1Router.use('/companies', CompaniesRouter)
app.use('/api/v1', v1Router);


app.get('/health-check', async (req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    res.status(200).json('connection success')
  } catch (error) {
    logger.error('Unable to connect to the database:', error);
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

app.listen(port, async () => {
  await sequelize.sync({ force: true });
  await sequelize.query(
    'ALTER TABLE "CompanyCustomer" ADD CONSTRAINT "CompanyCustomer_Customer_Id_Constraint" FOREIGN KEY("customer_id") REFERENCES "Customer" (id) ON DELETE CASCADE'
);
  logger.info('All models were synchronized successfully.');
  logger.info(`[server]: Server is running at http://localhost:${port}`);
});

customerSyncJob.start();
companySyncJob.start();
