import { CronJob } from 'cron';
import customShopifySession from '../shopifyClient';
import Company from '../database/models/companies.model';
import CompanyRole from '../database/models/company_roles.model';
import Customer from '../database/models/customers.model';
import CompanyCustomer from '../database/models/companies_customers.model';
import CompCustomerCompRole from '../database/models/companies_customers_company_roles.model';
import { getGqlIdAndSqlId } from '../utils';

const companySyncJob = new CronJob(
    '*/10 * * * * *', // cronTime
    async function () {
        try {
            let cursor: any = null;
            while(true) {
                const { data, extensions, headers } = await customShopifySession.request(
                    `
                    query ($numCompanies: Int!, $cursor: String) {
                        companies(first: $numCompanies, after: $cursor) {
                            edges{
                                node {
                                    id
                                    contactCount
                                    customerSince
                                    name
                                    note
                                    ordersCount {
                                        count
                                    }
                                    contactRoles(first: 100) {
                                        nodes {
                                            id
                                            name
                                            note
                                        }
                                    }
                                    contacts(first: 100) {
                                        nodes {
                                            id
                                            customer {
                                                id
                                            }
                                            title
                                            roleAssignments(first: 100) {
                                                nodes {
                                                    id
                                                    role {
                                                        id
                                                        name
                                                        note
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                                
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }`, {
                    variables: {
                        numCompanies: 5,
                        cursor
                    },                    
                });
                const { companies: { edges, pageInfo: { endCursor, hasNextPage }}} = data;

                for(const company of edges) {
                    const { node: {
                        id: gid,
                        contactCount,
                        customerSince,
                        name,
                        note,
                        ordersCount,
                        contactRoles,
                        contacts
                    }} = company;
                    const gidArray = gid.split('/');
                    const id = gidArray[gidArray.length - 1];

                    let comp = await Company.findByPk(id);
                    if(!comp) {
                        comp = Company.build({
                            id: id.toString(),
                            gid,
                            contactCount,
                            joinDate: customerSince,
                            name,
                            note,
                            ordersCount: ordersCount.count
                        });
                        await comp.save();
                    }
                    const confirmedComp = await Company.findByPk(id, { raw: true });                  
                    await checkAndInsertCompanyRole(contactRoles.nodes, confirmedComp.id)
                    await checkAndInsertCompanyContact(contacts.nodes, confirmedComp.id)
                }

                if(edges.length === 0) break;
                cursor = endCursor;
            }
        } catch(e: any) {
            // const error = e.body.errors;
            console.log(e)
        }
    },
    null, // onComplete
    true, // start
    'America/Los_Angeles' // timeZone
);

async function checkAndInsertCompanyRole(nodes: { id: string, name: string, note: string }[], companyId: string) {
    for(const role of nodes) {
        const { id: gqlId, name, note } = role;
        const [id, gid] = getGqlIdAndSqlId(gqlId)
        let r = await CompanyRole.findByPk(id);
        if(r) continue;
        r = CompanyRole.build({
            id: id.toString(),
            gid,
            name,
            note,
            companyId
        });
        await r.save();     
    }
}

async function checkAndInsertCompanyContact(
    nodes: {
        id: string,
        customer: {
            id: string,
        },
        title: string,
        roleAssignments: {
            nodes: { id: string, role: any }[]
        }
    }[],
    companyId: string
) {
    for(const contact of nodes) {
        const { id, customer, title, roleAssignments } = contact;
        
        // veriyfy customer existance
        let [customerId, customerGid] = getGqlIdAndSqlId(customer.id)
        const existedCustomer = await checkAndInsertCustomer(customerGid, customerId);
        
        // check m2m connection
        const existedConnection = await checkAndBindRelation(id, customerId, companyId);
        
        // discover roles
        const { nodes: roleAssigned } = roleAssignments;
        await checkAndBindRoleWithCustomer(roleAssigned, existedConnection.id);


    }
}

async function checkAndInsertCustomer(gqlId: string, customerId: string) {
    try {
        const customer = await Customer.findByPk(customerId, { raw: true });
        if(customer) return customer;
        const { data, extensions, headers } = await customShopifySession.request(
            `
            query {
                customer(id:"${gqlId}") {
                            id
                            firstName
                            lastName
                            email
                            phone
                            numberOfOrders
                            amountSpent {
                                amount
                                currencyCode
                            }
                            createdAt
                            updatedAt
                            note
                            verifiedEmail
                            validEmailAddress
                            tags
                            lifetimeDuration
                            defaultAddress {
                                formattedArea
                                address1
                            }
                            addresses {
                                address1
                            }
                            image {
                                src
                            }
                            canDelete
                }
            }`
        );
        const { customer: graphQLCustomer } = data;
        const {
            id: gid,
            firstName,
            lastName,
            email,
            phone,
            numberOfOrders,
            createdAt,
            updatedAt,
            note,
            verifiedEmail,
            validEmailAddress,
            lifetimeDuration,
            canDelete,
            tags,
            image,
            
            amountSpent,
            defaultAddress,
            addresses,
        } = graphQLCustomer;
        const gidArray = gid.split('/');
        const id = gidArray[gidArray.length - 1];
        let cust = Customer.build({
            id: id.toString(),
            gid,
            firstName,
            lastName,
            email,
            phone,
            numberOfOrders,
            joinDate: createdAt,
            lastUpdate: updatedAt,
            note,
            verifiedEmail,
            validEmailAddress,
            lifetimeDuration,
            canDelete,
            tags: tags.length ? tags.join(',') : null,
            imageSrc: image.src,
        });
        await cust.save();
        return Customer.findByPk(id, { raw: true })
    } catch(e: any) {
        console.log(e)
    }
}

async function checkAndBindRelation(connectionId: string, customerId: string, companyId: string) {
    let [id, ] = getGqlIdAndSqlId(connectionId);
    const connection = await CompanyCustomer.findByPk(id, { raw: true });
    if(connection) return connection;
    let builtConnection = CompanyCustomer.build({
        id,
        customerId,
        companyId,
    })
    await builtConnection.save();
    return CompanyCustomer.findByPk(id, { raw: true })
}

async function checkAndBindRoleWithCustomer(roles: { id: string, role: { id: string, name: string, note: string} }[], connecitonId: string) {
    for( const role of roles) {
        const { id, role: companyRole } = role;
        const [relationId, ] = getGqlIdAndSqlId(id);

        let builtConnection = await CompCustomerCompRole.findByPk(relationId, { raw: true });
        if(builtConnection) continue;
        const [companyRoleId, companyRoleGid] = getGqlIdAndSqlId(companyRole.id);
        builtConnection = CompCustomerCompRole.build({
            id: relationId,
            companyRoleId,
            companyCustomerId: connecitonId,
        })
        await builtConnection.save();
    }
}

export default companySyncJob