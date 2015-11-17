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