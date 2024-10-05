import { ValidationError } from "@sequelize/core";
import { Request, Response } from "express";
import Customer from "../database/models/customer.model";
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId, validatePhoneNumber } from "../utils";
import { companyRelatedCustomerAction } from "./companyRelatedCustomerAction";
import roleRelatedCustomerAction from "./roleRelatedCustomerAction";
import CustomersService from "./service";


export default class CustomersContoller {
    private _customersService: CustomersService;

    constructor(customersService: CustomersService) {
        this._customersService = customersService;
    }

    public findAllCustomers = async (req: Request, res: Response) => {
        try {
            let queryString: null | string = null;
            if (req.query.query) queryString = req.query.query as string
            const customers = await this._customersService.findAllCustomers(queryString)
            res.status(200).json(customers);
        } catch (e: any) {
            console.log(e instanceof ValidationError)
        }
    };

    public findCustomerById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const customerInfo = await this._customersService.findCustomerById(id)
            res.status(200).json(customerInfo)
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };

    public createCustomer = async (req: Request, res: Response) => {
        try {
            const createBody = Object.assign({}, req.body);
            const newCustomer = await this._customersService.createCustomer(createBody);
            res.status(201).json({ data: newCustomer })
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };

    public updateCustomerById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const {
                firstName,
                lastName,
                phone,
                email,
                note,
                tags,
                company,
                role
            } = req.body;

            let result;

            if (company || company === '') {
                result = await this._customersService.updateCustomerCompany(company, id)
                res.status(200).json({ data: result });
            } else if (role || role === '') {
                let roleArray = role;
                if (role === '') roleArray = [];
                else if (typeof role === 'string') roleArray = [role];

                result = await this._customersService.updateCustomerRole(roleArray, id)
                res.status(200).json({ data: result });
            } else {
                const updateObj: {
                    id: string,
                    firstName?: string,
                    lastName?: string,
                    phone?: string,
                    email?: string,
                    note?: string,
                    tags?: string,
                    company?: string,
                } = {
                    id: `gid://shopify/Customer/${id}`
                };
                if (firstName) updateObj.firstName = firstName;
                if (lastName) updateObj.lastName = lastName;
                if (phone && validatePhoneNumber(phone)) updateObj.phone = phone;
                if (email) updateObj.email = email;
                if (note) updateObj.note = note;
                if (tags || tags === '') updateObj.tags = tags;
                result = await this._customersService.updateCustomerInfo(updateObj, id)
            }
            res.status(200).json({ data: result })
        } catch (e: any) {
            console.log(e)
        }
    };

    public deleteCustomerById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const customerInfo = await this._customersService.deleteCustomerById(id)
            res.status(200).json({ data: customerInfo })
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };
}