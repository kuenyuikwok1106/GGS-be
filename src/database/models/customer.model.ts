import { DataTypes, Model } from "@sequelize/core";
import sequelize from '../postgres';

class Customer extends Model { };
Customer.init(
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
        firstName: {
            type: DataTypes.STRING,
        },
        lastName: {
            type: DataTypes.STRING,
        },
        email: {
            type: DataTypes.STRING,
        },
        phone: {
            type: DataTypes.STRING,
        },
        numberOfOrders: {
            type: DataTypes.INTEGER,
        },
        joinDate: {
            type: DataTypes.STRING,
        },
        lastUpdate: {
            type: DataTypes.STRING,
        },
        note: {
            type: DataTypes.TEXT,
        },
        verifiedEmail: {
            type: DataTypes.BOOLEAN,
        },
        validEmailAddress: {
            type: DataTypes.BOOLEAN,
        },
        lifetimeDuration: {
            type: DataTypes.STRING,
        },
        canDelete: {
            type: DataTypes.BOOLEAN,
        },
        tags: {
            type: DataTypes.STRING,
        },
        imageSrc: {
            type: DataTypes.TEXT,
        },
    },
    {
        // Other model options go here
        sequelize, // We need to pass the connection instance
        freezeTableName: true,
        underscored: true,
    },
);

export default Customer;
