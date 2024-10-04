import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';
import Company from "./companies.model";
import Customer from "./customers.model";

class CompanyCustomer extends Model {};

CompanyCustomer.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },

    },
    {
        // Other model options go here
        sequelize, // We need to pass the connection instance
        freezeTableName: true,

    },
)

Company.belongsToMany(Customer, { through: CompanyCustomer });
Customer.belongsToMany(Company, { through: CompanyCustomer });

export default CompanyCustomer;

