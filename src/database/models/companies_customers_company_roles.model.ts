import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';
import CompanyRole from "./company_roles.model";
import CompanyCustomer from "./companies_customers.model";

class CompCustomerCompRole extends Model { };

CompCustomerCompRole.init(
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


CompanyCustomer.belongsToMany(CompanyRole, { through: CompCustomerCompRole, });
CompanyRole.belongsToMany(CompanyCustomer, { through: CompCustomerCompRole });

// CompanyCustomer.hasMany(CompCustomerCompRole);
// CompCustomerCompRole.belongsTo(CompanyCustomer);
// CompanyRole.hasMany(CompCustomerCompRole);
// CompCustomerCompRole.belongsTo(CompanyRole);

export default CompCustomerCompRole;


