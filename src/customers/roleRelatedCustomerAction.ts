import CustomerCompanyRole from "../database/models/customer_company_role.model";

export default async function roleRelatedCustomerAction(roleArray: string[], customerId: string) {
    try {
        console.log({roleArray})
        const existing = await CustomerCompanyRole.findAll({
            where: { customerId },
            raw: true
        })
        if(roleArray.length === 0) {
            // remove everything
            if(!existing.length) return ({ data: 'no record has been deleted' })

            for(const role of existing) {
                console.log(role)
            }
        } else {
            const existingHash = new Map();
            for(const relation of existing) {
                existingHash.set(relation.companyRoleId, relation);
            }
            
            for(const updateRoleId of roleArray) {
                if(existingHash.has(updateRoleId)) {
                    console.log('done');
                    continue;
                }
                console.log('need build', updateRoleId)
            }

        }

    } catch {

    }

}