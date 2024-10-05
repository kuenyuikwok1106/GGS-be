import express, { Request, Response } from "express";
import Company from '../database/models/company.model';
import Customer from "../database/models/customer.model";
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId, validatePhoneNumber } from '../utils';
import CompanyRole from "../database/models/company_role.model";
import CustomerCompanyRole from "../database/models/customer_company_role.model";
import { companyRelatedCustomerAction } from "./companyRelatedCustomerAction";
import roleRelatedCustomerAction from "./roleRelatedCustomerAction";
import { Op, ValidationError } from "@sequelize/core";
import logger from "../winston.config";
import CustomersContoller from "./controller";
import CustomersService from "./service";


const multer = require('multer');
const router = express.Router();
const upload = multer();

const customersService = new CustomersService();
const customersContoller = new CustomersContoller(customersService);

router.get('/:id', customersContoller.findCustomerById);

router.delete('/:id', customersContoller.deleteCustomerById);

router.patch('/:id', upload.none(), customersContoller.updateCustomerById)

router.get('/', customersContoller.findAllCustomers);

router.post('/', upload.none(), customersContoller.createCustomer);

export default router;

