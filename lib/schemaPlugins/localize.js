var _ = require('underscore');
var Schema = require('mongoose').Schema;

module.exports = function localize () {

	var list = this;
	
	//var translatableFields = _.pick(list.fields, function(field, name, fields) { return field.translatable; });
	
	/*
	this.add({
		l10n: { type: translatableFields}
	});
	*/
	
	var language = 'de';
	
	function selectTranslations(next)
  {
    var query = this;
    
    
    //FIXME: check if projection is unset, if so, exclude dummy key to make this projection exclusive. $elemMatch makes projection inclusive by default, which results in only i10n being included in the result
    var projection = {
      'localization': { $elemMatch: { language: language } }
    };
    if(!query.selectedInclusively())
    {
      projection['dummy_'] = 0; //NOTE: order matters here! Behaviour changes if this is set BEFORE the localization projection is set!
    }
    else //selectedInclusively() == true
    {
      //TODO: select only localized fields that are selected at the top level
    }
    
    query.select(projection);
    return next();
  }
	
	this.schema.pre('find', selectTranslations);
	this.schema.pre('findOne', selectTranslations);
	
	this.schema.pre('update', function(next)
	{
	  console.log("Update called with query", this);
	  next();
	});
	
	this.schema.pre('save', function(next)
	{
	  console.log("Save called for doc", this);
	  next();
	});
};

module.exports.registerVirtuals = function registerVirtuals(list)
{
  var schema = list.schema;
  var translatableFields = _.pick(list.fields, function(field, name, fields) { return field.options.translatable; });
  var translatableFieldNames = Object.keys(translatableFields);
  
  var localizationSchema = new Schema({ language: 'string' });
  translatableFieldNames.forEach(function(fieldName)
  {
    console.log('Translatable field', fieldName);
    
    var schemaType = schema.path(fieldName);
    var options = {};
    options[fieldName] = schemaType.options;
    localizationSchema.add(options);
    
    schema.remove(fieldName);
    
    //console.log(schema.path(fieldName), schema.virtuals);
    
    schema.virtual(fieldName, { type: String}).get(function()
    {
      //strange! cannot access this.localization or any array properties directly, have to use _doc
      //console.log("Original document: ", this._doc, "localization", this._doc.localization[0][fieldName]);
      return this._doc.localization[0][fieldName];
    })
    .set(function(value)
    {
      this.localization[0][fieldName] = value;
    });
  });
  
  schema.add({ localization: [localizationSchema] });
};
