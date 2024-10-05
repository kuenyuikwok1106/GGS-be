import express from "express";
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
