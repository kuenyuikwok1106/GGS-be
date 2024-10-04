import express, { Request, Response } from "express";
import Company from '../database/models/company.model';
import CompanyCustomer from '../database/models/company_customer.model';
import CompanyRole from '../database/models/company_role.model';
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId } from '../utils';
import Customer from "../database/models/customer.model";
import { Op } from "@sequelize/core";
const multer = require('multer');
const router = express.Router();
const upload = multer();

router.post('/', upload.none(), async (req: Request, res: Response) => {
    try {
        let newCompany = Object.assign({}, req.body);

        const { data, extensions, headers } = await customShopifySession.request(`
        mutation($input: CompanyCreateInput!) {
          companyCreate(input: $input)
          {
            company {
              id
              name
            }
            userErrors {
              field
              message
            }
          }
        }`,
            {
                variables: {
                    input: { company: newCompany }
                }
            }
        );

        const gqlId = data.companyCreate.company.id;
        const [id, gid] = getGqlIdAndSqlId(gqlId);
        newCompany = Company.build({
            id,
            gid,
            ...newCompany,
            ordersCount: 0,
            contactCount: 0,
        })
        await newCompany.save()

        if (data.companyCreate.userErrors.length) {
            res.status(422).json({
                errors: data.companyCreate.userErrors
            })
        } else {
            res.status(201).json({
                data: newCompany
            })
        }
    } catch (e: any) {
        console.log(e)
        // const error = e.body.errors.graphQLErrors
        // console.log(error[0])
        // console.log(error[0].extensions)
    }
});

router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        const { data, extensions, headers } = await customShopifySession.request(`
        mutation companyDelete($id: ID!) {
          companyDelete(id: $id) {
            deletedCompanyId
            userErrors {
              field
              message
            }
          }
        }`,
            {
                variables: {
                    id: `gid://shopify/Company/${id}`
                }
            }
        );
        await Company.destroy({
            where: {
                id
            }
        })

        if (data.companyDelete.userErrors.length) {
            res.status(422).json({
                errors: data.companyDelete.userErrors
            })
        } else {
            res.status(200).json({
                data: data.companyDelete.deletedCompanyId
            })
        }
    } catch (e: any) {
        const error = e.body.errors.graphQLErrors
        console.log(error[0])
        console.log(error[0].extensions)
    }
});

router.get('/', async (req: Request, res: Response) => {
    try {
        let filter = { where: {} };
        if (req.query.query) {
            filter.where = {
                [Op.or]: [
                    {
                        name: { [Op.iLike]: `%${req.query.query}%` },
                    },
                ]
            }
        };
        const companies = await Company.findAndCountAll({
            ...filter
        })
        res.json(companies);
    } catch (e: any) {
        console.log(e.body.errors)
    }
});

router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const company = await Company.findByPk(id, {
            include: [
                {
                    model: Customer,
                    attributes: ['id', 'firstName', 'lastName', 'email'],
                    include: [
                        {
                          model: CompanyRole,
                          through: { attributes: [] },
                        }
                      ]
                },
                {
                    model: CompanyRole,
                }
            ],
        });

        res.json({ data: company });

    } catch (e: any) {
        console.log(e)
    }
});

router.patch('/:id', upload.none(), async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, note } = req.body;
        const updateObj: { name?: string, note?: string } = {};
        if (name) updateObj.name = name;
        if (note) updateObj.note = note;
        const { data, extensions, headers } = await customShopifySession.request(`
        mutation companyUpdate($companyId: ID!, $input: CompanyInput!) {
          companyUpdate(companyId: $companyId, input: $input) {
            company {
              id
              name
              note
            }
            userErrors {
              field
              message
            }
          }
        }`,
            {
                variables: {
                    "companyId": `gid://shopify/Company/${id}`,
                    "input": updateObj
                }
            }
        );

        if (data.companyUpdate.userErrors.length) {
            res.status(422).json({
                errors: data.companyUpdate.userErrors
            })
        }

        const company = await Company.findByPk(id);

        if (!company) throw Error
        company.set(updateObj)
        await company.save();
        console.log('saved', company)
        res.status(200).json({ data: company })
    } catch (e: any) {
        console.log(e)
    }
})

export default router;
