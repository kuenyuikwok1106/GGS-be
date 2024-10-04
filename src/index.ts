import '@shopify/shopify-api/adapters/node';
import express, { Express, raw, Request, Response } from "express";
import customShopifySession from './shopifyClient';
import customerSyncJob from './cronjob/customer';
import sequelize from './database/postgres';
import Customers from './database/models/customers.model'
import Companies from './database/models/companies.model'
import companySyncJob from './cronjob/companies';
import Company from './database/models/companies.model';
import CompanyCustomer from './database/models/companies_customers.model';
import CompCustomerCompRole from './database/models/companies_customers_company_roles.model';
import CompanyRole from './database/models/company_roles.model';
import { getGqlIdAndSqlId, validatePhoneNumber } from './utils';
import Customer from './database/models/customers.model';

const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const app: Express = express();
const port = process.env.PORT;
const upload = multer();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/customers/:id', async (req: Request, res: Response) => {
  try {
    const { id }= req.params;
    const customerInfo = await Customers.findByPk(id, {
      include: [
        {
          model: Company,
          attributes: [
            'name'
          ]
        },
        {
          required: false,
          association: Customer.associations.companiesCustomers,
          include: {
            association: 'companyRolesCompanyCustomers',
            required: false,
            include: {
              association: 'companyRole',
              // required: false
            }
          }
        }
      ],
    });
    console.log(customerInfo)
    if(!customerInfo) throw Error;


    // const customerRole = await CompCustomerCompRole.findAll({
    //   where:{
    //     cust
    //   }
    // })


    res.status(200).json(customerInfo)
  } catch(e) {
    console.log(e)
  }
});

app.delete('/customers/:id', async (req: Request, res: Response) => {
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

    await Customers.destroy({
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

app.get('/customers', async (req: Request, res: Response) => {
  try {
    const customers = await Customers.findAndCountAll({
      attributes:[
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
    })
    // console.log(customers)
    res.json(customers);
  } catch (e: any) {
    console.log(e)
  }
});

app.post('/customers', upload.none(), async (req: Request, res: Response) => {
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

app.patch('/customers/:id', upload.none(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      firstName,
      lastName,
      phone,
      email,
      note,
      tags,
    } = req.body;

    const updateObj: {
      id: string,
      firstName?: string,
      lastName?: string,
      phone?: string,
      email?: string,
      note?: string,
      tags?: string,
    } = {
      id: `gid://shopify/Customer/${id}`
    };
    if(firstName) updateObj.firstName = firstName;
    if(lastName) updateObj.lastName = lastName;
    if(phone && validatePhoneNumber(phone)) updateObj.phone = phone;
    if(email) updateObj.email = email;
    if(note) updateObj.note = note;
    if(tags || tags === '') updateObj.tags = tags;
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
  } catch (e: any) {
    console.log(e)
  }
})




















app.post('/companies', upload.none(), async (req: Request, res: Response) => {
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

app.delete('/companies/:id', async (req: Request, res: Response) => {
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

app.get('/companies', async (req: Request, res: Response) => {
  try {
    const companies = await Companies.findAndCountAll()
    res.json(companies);
  } catch (e: any) {
    console.log(e.body.errors)
  }
});

app.get('/companies/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const companyRoles = await CompanyRole.findAll({
      where: {
        companyId: id
      }
    })
    const companyInfo = await Company.findByPk(id);
    const companyCustomers = await CompanyCustomer.findAll(
      {
        where: {
          companyId: id
        },
        include: [
          {
            association: 'companyRolesCompanyCustomers',
            include: {
              model: CompanyRole,
              attributes: ['name']
            },
          },
          {
            model: Customers,
            attributes: [
              'id', 'firstName', 'lastName', 'email'
            ]
          }
        ],
      }
    );

    console.log({ companyInfo })

    res.json({
      companyRoles,
      companyInfo,
      companyCustomers
    });

  } catch (e: any) {
    console.log(e)
  }
});

app.patch('/companies/:id', upload.none(), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, note } = req.body;
    const updateObj: { name?: string, note?: string } = {};
    if(name) updateObj.name = name;
    if(note) updateObj.note = note;
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





app.get('/health-check/psql', async (req: Request, res: Response) => {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    res.status(200).json('connection success')
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

app.get('/', (req: Request, res: Response) => {
  res.send('Express + TypeScript Server');
});

app.listen(port, async () => {
  await sequelize.sync({ force: true });
  console.log('All models were synchronized successfully.');
  console.log(`[server]: Server is running at http://localhost:${port}`);
});

customerSyncJob.start();
companySyncJob.start();
