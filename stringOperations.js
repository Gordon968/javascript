'use strict';
String.prototype.isNullOrEmpty = function ()
{
    return ( !this ||  !this.trim() || this.length === 0 );
};

String.prototype.isBlank = function ()
{
    return (!this || /^\s*$/.test(this));
};

/**
 * trim leading characters specified by the charlist. 
 * Note it repeated trim all the characters until the first char is not in the charlist
 * @param{*} charlist - list of characters to be trimed at the end, i.e. '~0', it will repeated trim of ~ and 0
 */
String.prototype.trimLeft = function(charlist) 
{
    if (charlist === undefined)
      charlist = "\s";
  
    return this.replace(new RegExp("^[" + charlist + "]+"), "");
};
/**
 * trim trailing characters specified by the charlist. 
 * Note it repeated trim all the characters until the last char is not in the charlist
 * @param{*} charlist - list of characters to be trimed at the end, i.e. '~0', it will repeated trim of ~ and 0
 */
String.prototype.trimRight = function(charlist) 
{
    if (charlist === undefined)
      charlist = "\s";
  
    return this.replace(new RegExp("[" + charlist + "]+$"), "");
};

/**
 * trim leading/trailing characters specified by the charlist. 
 * Note it repeated trim all the characters until the first/last char is not in the charlist
 * @param{*} charlist - list of characters to be trimed at the end, i.e. '~0', it will repeated trim of ~ and 0
 */
String.prototype.trimLR = function(charlist)
{
    const trimedLeft = this.trimLeft(charlist);
    return trimedLeft.trimRight(charlist);
};

/**
* Description:  return a formated string value  
**              Usage example: "".format("x={0}, y={1}", "onething", "another thing");                              
* @param {*}    format - in the format of 'something {0}, another thing {1}...'
*                       
*@return:  foramted string, i.e. "x=onething, y=another thing"          
*/
String.prototype.format = function (format,)
{
    if( arguments.length === 0)
    {
        return undefined;
    }

    let retString = arguments[0];

    let args = [];
    let i=0;
    for(i=1; i<arguments.length; i++)
    {
        args.push(arguments[i]);
    }

    return retString.replace(/{(\d+)}/g, function(match, number) 
    { 
        return typeof args[number] != 'undefined' ? args[number]  : match;
    });
};


/**
* get sub values from a string that is separated from separator               
*                   i.e. getSubValue("CM#something#Id", "#", 1) will have value = "something" 
* @param {*}  this - original string                                            
* @param {*}  separator - symbol to separate string into parts
* @param {*}  index - index for the sub value located, 0-based 
* @return    sub string in the original string 
*/
String.prototype.getSubValue = function(separator, index)
{
    const segment = this && this.split(separator)[index];
    return segment && segment.trim();
};
/**
 * @description get the date upto the minutes in format of 'YYYY-MM-DD-HH:MM' from iso date time string ('YYYY-MM-DDTHH:MM:SS:SSSZ')
 * @param {*} isoDateTime - date time in iso format
 * @param {*} timeDateSeparator -the separator between date and Time in iso format (which is 'T')
 * @param {*} timeSeparator - the separator between hh, mm and ss in iso format (which is ":") 
 * @param {*} elementSeparator - element separator between each part in the retun date, (which is "-")
 */
String.prototype.getUptoMinutesFromDateTimeIsoString = function(timeDateSeparator='T', timeSeparator=':', elementSeparator='-')
{
    if( this.isNullOrEmpty())
    {
        return undefined;
    }
    
    let dateString = this.getSubValue(timeDateSeparator, 0);
    let timeString = this.getSubValue(timeDateSeparator, 1);
        
    let hh = timeString.getSubValue(timeSeparator, 0);

    let mm = timeString.getSubValue(timeSeparator, 1);
    let hhmm = hh+timeSeparator+mm;
    let uptoMinDateTime = dateString+elementSeparator+hhmm;
    return uptoMinDateTime;
};

String.prototype.getUptoDayFromDateTimeIsoString = function(timeDateSeparator='T', timeSeparator=':', elementSeparator='-')
{
    return this.getSubValue(timeDateSeparator, 0);
};
String.prototype.getUptoMonthFromDateTimeIsoString = function(timeDateSeparator='T', timeSeparator=':', elementSeparator='-')
{
    if( this.isNullOrEmpty())
    {
        return undefined;
    }
    let dateString = this.getSubValue(timeDateSeparator, 0);
    let lastIndex = dateString.lastIndexOf(elementSeparator);

    let ym = dateString.substring(0, lastIndex);
    return ym;
};

String.prototype.replaceAt = function(index, replaceMent)
{
    return this.substring(0, index) + replaceMent + this.substring(index + 1);    
};
module.exports = String;
