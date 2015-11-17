/**
 * Created by KMACIAZE on 17.11.2015.
 */
var Catalogue = function(args) {
    var catalogue = {};
    if(args.id) {
        catalogue.id = args.id;
    }
    catalogue.name = args.name;
    catalogue.ownerUserId = args.ownerUserId;
    catalogue.typeId = args.typeId;
    catalogue.rootPath = args.rootPath;

    return catalogue;
};
module.exports = Catalogue;