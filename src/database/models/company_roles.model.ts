import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';
import Company from "./companies.model";

class CompanyRole extends Model {};

CompanyRole.init(
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
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        note: {
            type: DataTypes.TEXT,
    
        }
    },
    {
        // Other model options go here
        sequelize, // We need to pass the connection instance
        freezeTableName: true,

    },
)

export default CompanyRole;