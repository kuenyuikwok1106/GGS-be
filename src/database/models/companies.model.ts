import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';
import CompanyRole from "./company_roles.model";

class Company extends Model { };

Company.init(
    {
        id: {
            type: DataTypes.STRING,
            primaryKey: true,
            allowNull: false,
        },
        gid: {
            type: DataTypes.STRING,
            allowNull: false
        },
        contactCount: {
            type: DataTypes.INTEGER,
        },
        joinDate: {
            type: DataTypes.STRING,
        },
        name: {
            type: DataTypes.STRING,
        },
        note: {
            type: DataTypes.TEXT,
        },
        ordersCount: {
            type: DataTypes.INTEGER,
        }

    },
    {
        // Other model options go here
        sequelize, // We need to pass the connection instance
        freezeTableName: true,

    },
);

Company.hasMany(CompanyRole);
CompanyRole.belongsTo(Company);


// await Company.sync({ alter: true });
// console.log('The table for the Company model was just (re)created!');
export default Company;
