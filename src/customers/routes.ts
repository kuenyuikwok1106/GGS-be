import express from "express";
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

