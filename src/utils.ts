export function getGqlIdAndSqlId (gid: string) {
    let gidArray = gid.split('/');
    let id = gidArray[gidArray.length - 1];
    return [id, gid];
}

export function validatePhoneNumber(phoneNumber: string) {
    var re = /^\+{0,2}([\-\. ])?(\(?\d{0,3}\))?([\-\. ])?\(?\d{0,3}\)?([\-\. ])?\d{3}([\-\. ])?\d{4}/;
    return re.test(phoneNumber);
};