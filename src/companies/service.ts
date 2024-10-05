import { Op } from "@sequelize/core";
import logger from "../winston.config";
import Company from "../database/models/company.model";
import CompanyRole from "../database/models/company_role.model";
import Customer from "../database/models/customer.model";
import { getGqlIdAndSqlId } from "../utils";
import customShopifySession from '../shopifyClient';


export default class CompaniesService {
    private _logger = logger;

    async findAllCompanies(queryString: string | null) {
        try {
            let filter = { where: {} };
            if (queryString) {
                filter.where = {
                    [Op.or]: [
                        {
                            name: { [Op.iLike]: `%${queryString}%` },
                        },
                    ]
                }
            }
            return Company.findAndCountAll({
                ...filter
            })
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async findCompaniesById(companyId: string) {
        try {
            const company = await Company.findByPk(companyId, {
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
                // raw: true
            });
            if (!company) throw new Error(`[CompaniessService] companyId (${companyId}) resource not exist`);
            return company;
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async createCompany(createBody: any) {
        try {
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
                        input: { company: createBody }
                    }
                }
            );

            if (data.companyCreate.userErrors.length) {
                throw new Error(`[CustomersService] ${data.companyCreate.userErrors.map((e: any) => e.message).join('\n')}`)
            }
            const gqlId = data.companyCreate.company.id;
            const [id, gid] = getGqlIdAndSqlId(gqlId);
            const newCompany = Company.build({
                id,
                gid,
                ...createBody,
                ordersCount: 0,
                contactCount: 0,
            })
            await newCompany.save()
            return newCompany;
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }

    }

    async updateCompanyById(updateBody: any, companId: string) {
        try {
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
                        "companyId": `gid://shopify/Company/${companId}`,
                        "input": updateBody
                    }
                }
            );
            if (data.companyUpdate.userErrors.length) {
                throw new Error(`[CustomersService] ${data.companyUpdate.userErrors.map((e: any) => e.message).join('\n')}`)
            }
            const company = await Company.findByPk(companId);

            if (!company) throw Error
            company.set(updateBody)
            await company.save();
            return company;
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async deleteCompanyById(companyId: string) {
        try {
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
                        id: `gid://shopify/Company/${companyId}`
                    }
                }
            );
            if (data.companyDelete.userErrors.length) {
                throw new Error(`[CompaniessService] ${data.companyDelete.userErrors.map((e: any) => e.message).join('\n')}`)
            }
            await Company.destroy({
                where: {
                    id: companyId
                }
            })
            return data.companyDelete.deletedCompanyId
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }
}
