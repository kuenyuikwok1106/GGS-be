import { Op } from "@sequelize/core";
import Company from "../database/models/company.model";
import Customer from "../database/models/customer.model";
import CompanyRole from "../database/models/company_role.model";
import logger from "../winston.config";
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId } from "../utils";
import { companyRelatedCustomerAction } from "./companyRelatedCustomerAction";
import roleRelatedCustomerAction from "./roleRelatedCustomerAction";

export default class CustomersService {
    private _logger = logger;

    async findAllCustomers(queryString: string | null) {
        try {
            let filter = { where: {} };
            if (queryString) {
                filter.where = {
                    [Op.or]: [
                        {
                            email: { [Op.iLike]: `%${queryString}%` },
                        },
                        {
                            firstName: { [Op.iLike]: `%${queryString}%` },
                        },
                        {
                            lastName: { [Op.iLike]: `%${queryString}%` },
                        }
                    ]
                }
            }
            return Customer.findAndCountAll({
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
                    ],
                },
                ...filter
            });
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async findCustomerById(customerId: string) {
        try {
            const customerInfo = await Customer.findByPk(customerId, {
                include: [
                    {
                        model: Company,
                        through: { attributes: [] },
                        include: {
                            model: CompanyRole,
                        }
                    },
                    {
                        model: CompanyRole,
                    }
                ]
            });
            if (!customerInfo) throw new Error(`[CustomersService] customerId (${customerId}) resource not exist`);
            return customerInfo;
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async createCustomer(createBody: any) {
        try {
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
                        input: createBody
                    }
                }
            );
            if (data.customerCreate.userErrors.length) {
                throw new Error(`[CustomersService] ${data.customerCreate.userErrors.map((e: any) => e.message).join('\n')}`)
            }
            const gqlId = data.customerCreate.customer.id;
            const [id, gid] = getGqlIdAndSqlId(gqlId);
            const newCustomer = Customer.build({
                id,
                gid,
                verifiedEmail: data.customerCreate.customer.verifiedEmail,
                validEmailAddress: data.customerCreate.customer.validEmailAddress,
                numberOfOrders: data.customerCreate.customer.numberOfOrders,
                canDelete: data.customerCreate.customer.canDelete,
                ...createBody,
            })
            await newCustomer.save();
            return newCustomer;
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }

    }

    async deleteCustomerById(customerId: string) {
        try {
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
                        id: `gid://shopify/Customer/${customerId}`
                    }
                }
            );
            if (data.customerDelete.userErrors.length) {
                throw new Error(`[CustomersService] ${data.customerDelete.userErrors.map((e: any) => e.message).join('\n')}`)
            }
            await Customer.destroy({
                where: {
                    id: customerId
                }
            })
            return data.customerDelete.deletedCustomerId
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async updateCustomerCompany(companyId: string, customerId: string) {
        try {
            return companyRelatedCustomerAction(companyId, customerId);
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async updateCustomerRole(roleArray: string[], customerId: string) {
        try {
            return roleRelatedCustomerAction(roleArray, customerId);
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }

    async updateCustomerInfo(updateBody: any, customerId: string) {
        try {
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
                        "input": updateBody
                    }
                }
            );
            if (data.customerUpdate.userErrors.length) {
                throw new Error(`[CustomersService] ${data.customerUpdate.userErrors.map((e: any) => e.message).join('\n')}`)
            }

            const customer = await Customer.findByPk(customerId);
            if (!customer) throw new Error(`[CustomersService] customerId (${customerId}) resource not exist`);
            customer.set(updateBody)
            await customer.save();
            return customer;
        } catch (e: any) {
            this._logger.error(e.message)
            throw new Error(e.message)
        }
    }
}
