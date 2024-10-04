import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';
import Company from "./company.model";
import Customer from "./customer.model";
import CompanyRole from "./company_role.model";

class CustomerCompanyRole extends Model {};

CustomerCompanyRole.init(
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
        underscored: true,
    },
)

Customer.belongsToMany(CompanyRole, { through: CustomerCompanyRole });
CompanyRole.belongsToMany(Customer, { through: CustomerCompanyRole });

export default CustomerCompanyRole;