import { CronJob } from 'cron';
import customShopifySession from '../shopifyClient';
import Customer from '../database/models/customer.model';
import { getGqlIdAndSqlId } from '../utils';

const customerSyncJob = new CronJob(
    '*/10 * * * * *', // cronTime
    async function () {
        try {
            let cursor: any = null;
            while(true) {
                const { data, extensions, headers } = await customShopifySession.request(
                    `
                    query ($numCustomers: Int!, $cursor: String) {
                        customers(first: $numCustomers, after: $cursor) {
                            edges{
                                node {
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
                            }
                            pageInfo {
                                hasNextPage
                                endCursor
                            }
                        }
                    }`, {
                    variables: {
                        numCustomers: 2,
                        cursor
                    },                    
                });
                const { customers: { edges, pageInfo: { endCursor, hasNextPage }}} = data;
                
                for(let customer of edges) {
                    const { node: {
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
                    }} = customer;
                    const [id, gId] = getGqlIdAndSqlId(gid);

                    let cust = await Customer.findByPk(id);
                    if(!cust) {
                        cust = Customer.build({
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
                        // console.log('new customer created');
                    }

                    // console.log(addresses)

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

export default customerSyncJob

