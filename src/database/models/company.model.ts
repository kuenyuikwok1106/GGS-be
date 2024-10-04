import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';
import CompanyRole from "./company_role.model";

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
        underscored: true,
    },
);

Company.hasMany(CompanyRole);
CompanyRole.belongsTo(Company);

export default Company;
