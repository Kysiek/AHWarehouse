/**
 * Created by Krzysztof on 2015-05-23.
 */
exports.randomString = function(stringLength){
    stringLength = stringLength || 12;
    var chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
    var result = '';
    for (var i=0; i<stringLength; i++) {
        var rnum = Math.floor(Math.random() * chars.length);
        result += chars.substring(rnum,rnum+1);
    }
    return result;

};
exports.createNewRootPathForRootPathAndSubDir = function(rootPath, subDirectory) {
    var array = [];
    if(rootPath) {
        array = JSON.parse(rootPath);
        array.push(subDirectory);
    } else {
        array.push(subDirectory);
    }
    return JSON.stringify(array);
};
exports.createInStatementForArray = function(rootPath) {
    var array = JSON.parse(rootPath);
    return "(" + array.join() + ")"
};
exports.createInStatementFromCatalogueArray = function(cataloguesArray) {
    var array = [];
    for(var i = 0, x = cataloguesArray.length; i < x; i++) {
        array.push(cataloguesArray[i].id);
    }
    return "(" + array.join() + ")"
};
exports.addPrefixWithUnderScoreToString = function(prefix, name) {
    return prefix + "_" + name;
};