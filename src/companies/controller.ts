import { Request, Response } from "express";
import CompaniesService from "./service";


export default class CompaniesContoller {
    private _companiesService: CompaniesService;

    constructor(companiesService: CompaniesService) {
        this._companiesService = companiesService;
    }

    public findAllCompanies = async (req: Request, res: Response) => {
        try {
            let queryString: null | string = null;
            if (req.query.query) queryString = req.query.query as string;
            const companies = await this._companiesService.findAllCompanies(queryString)
            res.status(200).json(companies);
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };

    public findCompaniesById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const companyInfo = await this._companiesService.findCompaniesById(id)
            res.json({ data: companyInfo });
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };

    public createCompany = async (req: Request, res: Response) => {
        try {

            const createBody = Object.assign({}, req.body);
            const newCompany = await this._companiesService.createCompany(createBody);
            res.status(201).json({ data: newCompany })
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };

    public updateCompanyById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const { name, note } = req.body;
            const updateObj: { name?: string, note?: string } = {};
            if (name) updateObj.name = name;
            if (note) updateObj.note = note;
            const result = await this._companiesService.updateCompanyById(updateObj, id)
            res.status(200).json({ data: result })
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };

    public deleteCompanyById = async (req: Request, res: Response) => {
        try {
            const { id } = req.params;
            const companyInfo = await this._companiesService.deleteCompanyById(id);
            res.status(200).json({ data: companyInfo })
        } catch (e: any) {
            res.status(404).json(e.message)
        }
    };
}