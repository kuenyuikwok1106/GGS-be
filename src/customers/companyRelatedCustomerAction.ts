import CompanyCustomer from "../database/models/company_customer.model";
import customShopifySession from '../shopifyClient';
import { getGqlIdAndSqlId } from "../utils";

const deleteRelation = async (relationId: string, customerId: string) => {
    const { data, extensions, headers } = await customShopifySession.request(`
        mutation companyContactDelete($companyContactId: ID!) {
            companyContactDelete(companyContactId: $companyContactId) {
                deletedCompanyContactId
                userErrors {
                    field
                    message
                }
            }
        }`,
        {
            variables: {
                "companyContactId": `gid://shopify/CompanyContact/${relationId}`
            }
        }
    );
    if (data.companyContactDelete.userErrors.length) {
        return { errors: data.companyContactDelete.userErrors };
    }

    await CompanyCustomer.destroy({
        where: {
            customerId,
        },
      });
    return { data: data.companyContactDelete.deletedCompanyContactId };
}

const createRelation = async (customerId: string, companyId: string) => {
    const { data, extensions, headers } = await customShopifySession.request(`
        mutation companyAssignCustomerAsContact($companyId: ID!, $customerId: ID!) {
            companyAssignCustomerAsContact(companyId: $companyId, customerId: $customerId) {
                companyContact {
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
                "companyId": `gid://shopify/Company/${companyId}`,
                "customerId": `gid://shopify/Customer/${customerId}`
            }
        }
    );
    if (data.companyAssignCustomerAsContact.userErrors.length) {
        return ({
            errors: data.customerUpdate.userErrors
        })
    }
    const [id, gid] = getGqlIdAndSqlId(data.companyAssignCustomerAsContact.companyContact.id)
    const relation = CompanyCustomer.build({
        id,
        customerId,
        companyId: companyId
    })
    await relation.save();
    return { data: relation }
}

export async function companyRelatedCustomerAction(company: any, customerId: string) {
    // delete company connection
    if (company || company === '') {
        const existing = await CompanyCustomer.findOne({
            where: {
                customerId,
            },
            raw: true
        })

        if (company === '') {
            if (!existing) return { errors: 'relation not found' };
            return deleteRelation(existing.id, customerId);
        } else {
            // create new
            if(existing) await deleteRelation(existing.id, customerId);
            return createRelation(customerId, company);
        }
    }
}