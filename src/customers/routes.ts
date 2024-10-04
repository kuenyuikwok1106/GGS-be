import express, { Request, Response } from "express";
import Company from '../database/models/company.model';
import Customer from "../database/models/customer.model";
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId, validatePhoneNumber } from '../utils';
import CompanyRole from "../database/models/company_role.model";
import CustomerCompanyRole from "../database/models/customer_company_role.model";
import { companyRelatedCustomerAction } from "./companyRelatedCustomerAction";
import roleRelatedCustomerAction from "./roleRelatedCustomerAction";
import { Op } from "@sequelize/core";
const multer = require('multer');

const router = express.Router();
const upload = multer();

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const customerInfo = await Customer.findByPk(id, {
            include: [
                {
                    model: Company,
                    through: { attributes: [] }, // This will exclude the junction table data
                    include: {
                        model: CompanyRole,
                    }
                },
                {
                    model: CompanyRole,
                }
            ]
        });

        if (!customerInfo) throw Error;
        res.status(200).json(customerInfo)
    } catch (e) {
        console.log(e)
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { data, extensions, headers } = await customShopifySession.request(`
        mutation customerDelete($id: ID!) {
          customerDelete(input: {id: $id}) {
            shop {
              id
            }
            userErrors {
              field
              message
            }
            deletedCustomerId
          }
        }`,
            {
                variables: {
                    id: `gid://shopify/Customer/${id}`
                }
            }
        );
        if (data.customerDelete.userErrors.length) {
            res.status(422).json({
                errors: data.customerDelete.userErrors
            })
        }

        await Customer.destroy({
            where: {
                id
            }
        })
        res.status(200).json({
            data: data.customerDelete.deletedCustomerId
        })
    } catch (e: any) {
        const error = e.body.errors.graphQLErrors
        console.log(error[0])
        console.log(error[0].extensions)
    }
});

router.patch('/:id', upload.none(), async (req: Request, res: Response) => {
    try {
        console.log(req.body)
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

        if (company || company === '') {
            const result = await companyRelatedCustomerAction({ company }, id);
            console.log(result)
            if (result && result?.errors) {
                res.status(422).json(result);
            }
            res.status(200).json(result);
        } else if (role || role === '') {
            let roleArray = role;
            if (role === '') roleArray = [];
            else if (typeof role === 'string') roleArray = [role];
            const result = await roleRelatedCustomerAction(roleArray, id);


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
            console.log(updateObj)

            const { data, extensions, headers } = await customShopifySession.request(`
            mutation updateCustomerMetafields($input: CustomerInput!) {
              customerUpdate(input: $input) {
                customer {
                  id
                }
                userErrors {
                  field
                  message
                }
              }
            }`,
                {
                    variables: {
                        "input": updateObj
                    }
                }
            );
            console.log(data.customerUpdate.userErrors)
            if (data.customerUpdate.userErrors.length) {
                res.status(422).json({
                    errors: data.customerUpdate.userErrors
                })
            }

            const customer = await Customer.findByPk(id);
            if (!customer) throw Error
            customer.set(updateObj)
            await customer.save();
            console.log('saved', customer)
            res.status(200).json({ data: customer })
        }
    } catch (e: any) {
        console.log(e)
    }
})

router.get('/', async (req: Request, res: Response) => {
    try {
        let filter = { where: {} };
        if (req.query.query) {
            filter.where = {
                [Op.or]: [
                    {
                        email: { [Op.iLike]: `%${req.query.query}%` },
                    },
                    {
                        firstName: { [Op.iLike]: `%${req.query.query}%` },
                    },
                    {
                        lastName: { [Op.iLike]: `%${req.query.query}%` },
                    }
                ]
            }
        };
        const customers = await Customer.findAndCountAll({
            attributes: [
                'id',
                'firstName',
                'lastName',
                'email',
                'createdAt',
                'tags',
                'imageSrc',
            ],
            include: {
                model: Company,
                attributes: [
                    'name'
                ]
            },
            ...filter
        })
        res.json(customers);
    } catch (e: any) {
        console.log(e)
    }
});

router.post('/', upload.none(), async (req: Request, res: Response) => {
    try {
        let newCustomer = Object.assign({}, req.body);
        const { data, extensions, headers } = await customShopifySession.request(`
        mutation($input: CustomerInput!) {
          customerCreate(input: $input)
          {
            customer {
              id
              displayName
              verifiedEmail
              validEmailAddress
              numberOfOrders
              canDelete
            }
            userErrors {
              field
              message
            }
          }
        }`,
            {
                variables: {
                    input: newCustomer
                }
            }
        );
        if (data.customerCreate.userErrors.length) {
            res.status(422).json({
                errors: data.customerCreate.userErrors
            })
        }

        const gqlId = data.customerCreate.customer.id;
        const [id, gid] = getGqlIdAndSqlId(gqlId);
        newCustomer = Customer.build({
            id,
            gid,
            verifiedEmail: data.customerCreate.customer.verifiedEmail,
            validEmailAddress: data.customerCreate.customer.validEmailAddress,
            numberOfOrders: data.customerCreate.customer.numberOfOrders,
            canDelete: data.customerCreate.customer.canDelete,
            ...newCustomer,
        })
        await newCustomer.save();
        res.status(201).json({
            data: newCustomer
        })

    } catch (e: any) {
        const error = e.body.errors.graphQLErrors
        console.log(error[0])
        console.log(error[0].extensions)
    }
});

export default router;

