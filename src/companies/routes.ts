import express, { Request, Response } from "express";
import Company from '../database/models/company.model';
import CompanyCustomer from '../database/models/company_customer.model';
import CompanyRole from '../database/models/company_role.model';
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId } from '../utils';
import Customer from "../database/models/customer.model";
import { Op } from "@sequelize/core";
import CompaniesContoller from "./controller";
import CompaniesService from "./service";
const multer = require('multer');
const router = express.Router();
const upload = multer();

const companiesService = new CompaniesService();
const companiesContoller = new CompaniesContoller(companiesService);

router.get('/:id', companiesContoller.findCompaniesById);

router.patch('/:id', upload.none(), companiesContoller.updateCompanyById)

router.delete('/:id', companiesContoller.deleteCompanyById);

router.post('/', upload.none(), companiesContoller.createCompany);

router.get('/', companiesContoller.findAllCompanies);


export default router;
