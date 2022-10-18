'use strict';
const stringOps = require('./stringOperations');
const zlib = require('zlib');
const moment = require('moment'); 
const Consts = require('../Constants/constants');

class CommonHelper
{
    constructor()
    {
        this.ISOEndChar = "Z";
    }
    
    /**
     * create a promise with object wrapped in
     * @param {*} objToReturn - object wrapped into the promise
     * @param {*} isPromiseKept - indicate if it is resolved (value true) or rejected promise (value false)
     */
    CreatePromise(objToReturn, isPromiseKept=false)
    {
        return new Promise(function(resolve, reject)
        {
            if( isPromiseKept )
            {
                resolve(objToReturn);
            }
            else
            {
                reject(objToReturn);
            }
        });
    }
    /**
     * check to see if the obj is empty
     * @param {*} obj - the object to be checked
     */
    isEmpty(obj)
    {
        if( !obj )
        {
            return true;
        }
        return (Object.keys(obj).length <= 0);
    }

    /**
     * create a "timer"
     * @param {*} ms the time delayed in milliseconds
     */
    timer(ms)
    {
        return new Promise(res=>setTimeout(res, ms));
    }

    /**
     * Split the bigger array into an array of small arrays
     * @param {*} originArray - the original bigger arrays
     * @param {*} size - the size for the newly created smaller arrays (>0)
     */
    SplitArrayIntoArrays(originArray, size)
    {
        if( !originArray || size <= 0 )
        {
            return [originArray];
        }
        const originArraysCloned = JSON.parse(JSON.stringify(originArray));
        let returnArraryOfArrays = [];
        while(originArraysCloned.length > 0 )
        {
            let arrsFixSize = originArraysCloned.splice(0, size);
            returnArraryOfArrays.push(arrsFixSize);
        }
        return returnArraryOfArrays;
    }

    /**
     * Break the array into smaller size (break into a few arrays) so that we can do the parallel loop on a smaller size scale, 
     * especially when you access dynamodb table parallel
     * @param {*} originalArray - the array need to do manipulate with the function (handler in the parameter list)
     * @param {*} newArraySize - the new size for each sub array
     * @param {*} handler - the callback function that need to call for each elements, and the element is the first parameter need to pass to, other parameters needed
     *                      for handler follows after the comma
     */
    async workWithArrayPartialParallel(originalArray, newArraySize, handler,)
    {
        //  at least 3 arguments
        if( arguments.length < 3)
        {
            return undefined;
        }
        let newArgumentsForCallback = [];
        for(let i=3; i<arguments.length; i++)
        {
            newArgumentsForCallback.push(arguments[i]);
        }
        
        let allArrayInfos = [];
        //  each elemet in the following smallerArrays is the array with size of newArraySize
        let smallerArrays = this.SplitArrayIntoArrays(originalArray, newArraySize);
        for(const index in smallerArrays)
        {
            let smallerArrayatI = smallerArrays[index];
            let smallerArrayInfos = smallerArrayatI.map(async (element)=>
            {
                let handlerArgs = [];
                handlerArgs.push(element);
                handlerArgs = handlerArgs.concat(newArgumentsForCallback);
                //  the following is same as handler(callBackArgs[0], callBackArgs[1], ...)
                return handler.apply(null, handlerArgs);
            });
            try
            {
                await Promise.all(smallerArrayInfos)
                .then(smallerArrayInfo=>
                {
                    allArrayInfos = allArrayInfos.concat(smallerArrayInfo);    
                }, error=>
                {
                    console.error("Function call Failed: " + handler.name + JSON.stringify(error, undefined, 2));
                });
            }
            catch(error)
            {
                console.error("Function call Failed: " + handler.name + JSON.stringify(error, undefined, 2));
            }
        }

        return allArrayInfos;
    }

    /**
     * Break the array into smaller size (break into a few arrays), handler takes an array of element in the first arguments, we will parallel execute the function in trunks 
     * @param {*} originalArray - the array need to do manipulate with the function (handler in the parameter list)
     * @param {*} newArraySize - the new size for each sub array
     * @param {*} handler - the callback function that need to call for each elements, and the element is the first parameter need to pass to, other parameters needed
     *                      for handler follows after the comma
     */
    async workWithArrayParallelInSmallerTrunks(originalArray, newArraySize, handler,)
    {
        //  at least 3 arguments
        if( arguments.length < 3)
        {
            return undefined;
        }
        let newArgumentsForCallback = [];
        for(let i=3; i<arguments.length; i++)
        {
            newArgumentsForCallback.push(arguments[i]);
        }
        
        let allArrayInfos = [];
        //  each elemet in the following smallerArrays is the array with size of newArraySize
        let smallerArrays = this.SplitArrayIntoArrays(originalArray, newArraySize);

        let smallerArraryPromises = smallerArrays.map(async (smallerAray)=>
        {
            let handlerArgs = [];
            handlerArgs.push(smallerAray);
            handlerArgs = handlerArgs.concat(newArgumentsForCallback);
            return handler.apply(null, handlerArgs);
        });

        try
        {
            await Promise.all(smallerArraryPromises).then(
                smallerArrayPromise=>{ allArrayInfos = allArrayInfos.concat(smallerArrayPromise);},
                error=>{ console.log("Function call failed: " + handler.name + JSON.stringify(error, undefined, 2));}
            );
        }
        catch(error)
        {
            console.error("Function call Failed: " + handler.name + JSON.stringify(error, undefined, 2));
        }
        
        return allArrayInfos;
    }

     /**
     * Parallel handle the arrays 
     * @param {*} originalArray - the array need to do manipulate with the function (handler in the parameter list)
     * @param {*} handler - the callback function that need to call for each elements, and the element is the first parameter need to pass to, other parameters needed
     *                      for handler follows after the comma
     */
    async workWithArrayParallel(originalArray, handler,)
    {
        //  at least 3 arguments
        if( arguments.length < 3)
        {
            return undefined;
        }
        let newArgumentsForCallback = [];
        for(let i=2; i<arguments.length; i++)
        {
            newArgumentsForCallback.push(arguments[i]);
        }
        
        let elementPromises = originalArray.map(async (element)=>
        {
            let handlerArgs = [];
            handlerArgs.push(element);
            handlerArgs = handlerArgs.concat(newArgumentsForCallback);
            return handler.apply(null, handlerArgs);
        });
        let allArrayInfos = [];
        try
        {
            await Promise.all(elementPromises).then(
                allElements=>{ allArrayInfos = allArrayInfos.concat(allElements);},
                error=>{ console.log("Function call failed: " + handler.name + JSON.stringify(error, undefined, 2));}
            );
        }
        catch(error)
        {
            console.error("Function call Failed: " + handler.name + JSON.stringify(error, undefined, 2));
        }
        
        return allArrayInfos;
    }

    /**
     * in a async function, we can use await Sleep(2000), it will wait for 2000 ms
     * @param {*} timeMilliSecs - how much time needs to wait
     * @returns 
     */
    Sleep(timeMilliSecs)
    {
        return new Promise(r => setTimeout(r, timeMilliSecs));
    }

    GetIsoDate(dateTime, format=Consts.DateFormat.FormatUpToSecond)
    {
        return this.GetDateTimeInFormat(dateTime, format);
    }

    /**
     * Get the date with offset related to input date
     * @param {*} inputDate - valid date or non, if it is non, we use current date
     * @param {*} offset - number, >0 means add to the date, <0 subtract from date
     * @param {*} unit - one of these string value:
     * "year" | "years" | "y" |
     * "month" | "months" | "M" |
     * "week" | "weeks" | "w" |
     * "day" | "days" | "d" |
     * "hour" | "hours" | "h" |
     * "minute" | "minutes" | "m" |
     * "second" | "seconds" | "s" |
     * "millisecond" | "milliseconds" | "ms"
     * @param {*} format - has the value like yyyy-mm-ddThh:MM:ss.SSS, see values in Consts.DateFormat
     */
    GetDateWithOffset(inputDate, offset, unit, format=Consts.DateFormat.FormatUpToSecond)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = (inputDate && inputDate.includes(this.ISOEndChar));
        return moment(!inputDate ? this.GetCurrentDateTimeIso() : inputDate.replace(this.ISOEndChar, "")).add(offset, unit).utc(keepLocalTime).format(format) + this.ISOEndChar;
    }

    GetMonthEndDateIso(dateTimeIso, format=Consts.DateFormat.FormatUpToSecond)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTimeIso.includes(this.ISOEndChar);
        return moment(dateTimeIso.replace(this.ISOEndChar, "")).utc(keepLocalTime).endOf('month').format(format) + this.ISOEndChar;
    }

    GetMonthFirstDateIso(dateTimeIso, format=Consts.DateFormat.FormatUpToSecond)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTimeIso.includes(this.ISOEndChar);
        return moment(dateTimeIso.replace(this.ISOEndChar, "")).utc(keepLocalTime).startOf('month').format(format) + this.ISOEndChar;
    }

    GetDayFirstHour(dateTime, format=Consts.DateFormat.FormatUpToMin, inIsoFormat=false)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).startOf('day').format(format) + (inIsoFormat ? this.ISOEndChar : "");
    }

    GetDayLastHour(dateTime, format=Consts.DateFormat.FormatUpToMin, inIsoFormat=false)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).endOf('day').format(format) + (inIsoFormat ? this.ISOEndChar : "");
    }
    GetMonthFirstDay(dateTime, format=Consts.DateFormat.FormatUpToDay, inIsoFormat=false)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).startOf('month').format(format) + (inIsoFormat ? this.ISOEndChar : "");
    }

    GetMonthLastDay(dateTime, format=Consts.DateFormat.FormatUpToDay, inIsoFormat=false)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).endOf('month').format(format) + (inIsoFormat ? this.ISOEndChar : "");
    }

    GetYearFirstMonth(dateTime, format=Consts.DateFormat.FormatUpToMonth, inIsoFormat=false)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).startOf('year').format(format) + (inIsoFormat ? this.ISOEndChar : "");
    }

    GetYearLastMonth(dateTime, format=Consts.DateFormat.FormatUpToMonth, inIsoFormat=false)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).endOf('year').format(format) + (inIsoFormat ? this.ISOEndChar : "");
    }


    /**
     * It returns date time string in the foramt specified. If not specified, it will return iso string for current date
     * @param {*} formatStr - format string, i.e. "YYYY-MM-DDTHH:mm:ss.SSS", if null, then return iso string (with Z appended to the end)
     */
    GetCurrentDateTimeIso(formatStr = Consts.DateFormat.FormatUpToSecond)
    {
        return !formatStr ? moment(Date.now()).utc(false).toISOString() : this.GetDateTimeInFormat(moment(Date.now()).utc(false).toISOString(), formatStr);
    }

    /**
     * Get date time string in the format specified by formatStr
     * @param {*} dateTimeIso - dateTime iso format
     * @param {*} formatStr - format string, i.e. "YYYY-MM-DDTHH:mm:ss.SSS"
     */
    GetDateTimeInFormat(dateTimeIso, formatStr)
    {
        //  if dateTimeIso includes Z at the end, it means it is already utc time, 
        //  so we don't need to convert and pretend it is local time. Stupid, I know. But if we pass a date includes "Z"
        //  into the moment, it complains, so we add this chicks
        const keepLocalTime = dateTimeIso.includes(this.ISOEndChar);
        return moment(dateTimeIso.replace(this.ISOEndChar, "")).utc(keepLocalTime).format(formatStr) + this.ISOEndChar;
    }
    GetDateTimeInIso(inputDate, formatStr=Consts.DateFormat.FormatUpToSecond)
    {
        return this.GetDateTimeInFormat(inputDate, formatStr);
    }

    SeparateDateTimeFromIso(dateTime)
    {
        if( !dateTime )
        {
            return null;
        }
        const date = dateTime.getSubValue(Consts.ConstStr.DateTimeSeparator, 0);
        const time = dateTime.getSubValue(Consts.ConstStr.DateTimeSeparator, 1).replace(this.ISOEndChar, "");
        return {"date": date, "time" : time};
    }
    /**
     * Get year for the date in number
     * @param {*} dateTime 
     * @returns the year in number
     */
    GetYearFromDateTime(dateTime)
    {
        const keepLocalTime = dateTime.includes(this.ISOEndChar);
        return moment(dateTime.replace(this.ISOEndChar, "")).utc(keepLocalTime).year();
    }

    GetTimeDifferenceInSeconds(dateIso1, dateIso2)
    {
        const date2 = moment(dateIso2);
        const date1 = moment(dateIso1);
    
        return date2.isValid() && date1.isValid() ? moment.duration(date2.diff(date1)).asSeconds() : 0;
    }

    GetTimeDifferenceInReadableFormat(dateIso1, dateIso2, formatStr=Consts.DateFormat.FormatUpToSecond)
    {
        const timeDiffInSeconds = this.GetTimeDifferenceInSeconds(dateIso1, dateIso2);
        const days = timeDiffInSeconds/(24*3600);
        const intDays = Math.floor(days);
        const fracDays = days-intDays;
        const hours = fracDays * 24;
        const intHours = Math.floor(hours);
        const fracHours = hours - intHours;
        const minutes = fracHours*60;
        const intMinutes = Math.floor(minutes);
        const fracMinutes = minutes - intMinutes;
        const seconds = Math.round(fracMinutes * 60);
        let output = "".format("{0} days {1} hours {2} minutes {3} seconds", intDays, intHours, intMinutes, seconds);
        if( formatStr === Consts.DateFormat.FormatUpToMin )
        {
            output = "".format("{0} days {1} hours {2} minutes", intDays, intHours, intMinutes);
        } 
        else if( formatStr === Consts.DateFormat.FormatUpToHour )
        {
            output = "".format("{0} days {1} hours", intDays, intHours);
        }
        else if( formatStr === Consts.DateFormat.FormatUpToDay )
        {
            output = "".format("{0} days", intDays);
        }
        return output;
    }

    /**
     * check to see if it is a leap year
     * @param {*} year the year, is a number 
     */
    IsLeapYear(year)
    {
        return ( year%400 === 0 || (year%4 ===0 && year%100 !== 0 ));
    }

    EpochToIso(epoch, format=Consts.DateFormat.FormatUpToMilliSeconds)
    {
        //  epoch time usually in seconds but javascript takes milliseconds
        if (epoch < 10000000000)
        {
            epoch *= 1000; // convert to milliseconds (Epoch is usually expressed in seconds, but Javascript uses Milliseconds)
        }

        return moment(epoch).utc(false).format(format) + this.ISOEndChar;
    }
    /**
     * Convert iso date to Epoch time, default in millionseconds
     * @param {*} dateIso - date in iso format
     * @param {*} isInSeconds - true, return epoch time in seconds (10 digit); false return in milliseconds (13 digits)
     * @returns number in epoch time
     */
    Epoch(dateIso, isInSeconds=false)
    {
        //return isInSeconds ? Math.round((new Date(dateIso)).getTime() / 1000.0) : (new Date(dateIso)).getTime();   
        return isInSeconds ? moment(dateIso).unix() : parseInt(moment(dateIso).format('x'));  
    }

    /**
     * @param {*} dateIso - iso date
     * @param {*} day can be number 1 to 7 represents string "Monday" to "Sunday"
     * @returns 
     */
    IsWeekDay(dateIso, day)
    {
        return moment(dateIso).weekday() === day;
    }

    /**
     * compare 2 values that can be number or string, ascending comparison
     * @param {*} a 
     * @param {*} b 
     */
    CompareFun(a, b)
    {
        if( a < b )
        {
            return -1;
        }
        else if( a > b )
        {
            return 1;
        }
        else
        {
            return 0;
        }
    }
    /**
     * compress the obj using zlib
     * @param {*} obj - objects to compress
     */
    CompressObj(obj)
    {
        return obj && zlib.gzipSync(JSON.stringify(obj));
    }
    /**
     * Decompress the objects using zlib
     * @param {*} obj - compressed objects
     */
    Decompress(obj)
    {
        return obj && JSON.parse(zlib.gunzipSync(obj).toString());
    }

    DecompressWithEncode(obj, encode="base64")
    {
        //  python set base64 as encoding when compress
        return obj && JSON.parse(zlib.unzipSync(Buffer.from(obj, encode)).toString());
    }
    /**
     * compare 2 object to see if it is the same
     * @param {*} jsobj1 
     * @param {*} jsobj2 
     */
    IsEqual(jsobj1, jsobj2)
    {
        if(jsobj1 === jsobj2)
        {
            //  both are null or "", or they are equal
            return true;
        }
        if(!jsobj1 || !jsobj2)
        {
            return false;
        }
        
        let keysObj1 = Object.keys(jsobj1);
        let keysObj2 = Object.keys(jsobj2);

        if( keysObj1.length != keysObj2.length)
        {
            return false;
        }

        for(let theKey of keysObj1)
        {
            let valueObj1 = jsobj1[theKey];
            let valueObj2 = jsobj2[theKey];

            if( JSON.stringify(valueObj1) === JSON.stringify(valueObj2))
            {
                continue;
            }

            if( typeof valueObj1 === "string" || typeof valueObj2 === "string" )
            {
                //  this are string and they are not equal
                return false;
            }

            if( hasAnyProperty(valueObj1) && hasAnyProperty(valueObj2))
            {
                let isSame = this.IsEqual(valueObj1, valueObj2);
                if( !isSame)
                {
                    return false;
                }
            }
            else
            {
            return false; 
            }
        }

        return true;
    }

    AreCertainPropertiesTheSame(obj1, obj2, propertyToCheckArray)
    {
        if( !obj1 || !obj2)
        {
            return false;
        }

        if( !propertyToCheckArray || propertyToCheckArray.length === 0)
        {
            //  nothing to compare
            return true;
        }
        const sameValuesProperty = propertyToCheckArray.filter(x=>{ return this.IsEqual(obj1[x], obj2[x]);});
        return sameValuesProperty.length === propertyToCheckArray.length;
    }

    /**
     * Get the property names that their values in new objects is not the same as original objects 
     * @param {*} objOrigin - the origin obj
     * @param {*} objNew - the new objects
     * @param {*} propertyToCheckArray - the property names to check
     */
    GetPropertyNamesForNewObjValueNotTheSameAsOrigin(objOrigin, objNew, propertyToCheckArray)
    {
        if( !objOrigin || !objNew)
        {
            return false;
        }

        if( !propertyToCheckArray || propertyToCheckArray.length === 0)
        {
            //  nothing to compare
            return true;
        }
        const diffValuesProperty = propertyToCheckArray.filter(x=>{ return (objNew[x] != null && !this.IsEqual(objOrigin[x], objNew[x]));});

        return diffValuesProperty;
    }

    DecodeExclusiveStartKey(encodedString)
    {
        return !encodedString ? null : JSON.parse(decodeURI(encodedString));
    }
    /**
     * we use encodeURI not encode base64 to encode the exclusive, becase encodeBase64 some times have "+" that replaced with " " in query string
     * It returns encoded string
     * @param {*} exclusiveStartKey - json object for exclusive start key
     */
    EncodeExclusiveStartKey(exclusiveStartKey)
    {
        return !exclusiveStartKey ? "" : encodeURI(JSON.stringify(exclusiveStartKey));
    }

    ConstructUpdateExpressionFromObj(jsonObj)
    {
        return jsonObj && 'set ' + Object.keys(jsonObj).sort().map((_, i) => `#key${i} = :value${i}`).join(', ');
    }

    ConstructExpressionAttributeNamesFromObj(jsonObj)
    {
        return Object.keys(jsonObj).sort().reduce((prevResult, key) => {
            const currResult = { ...prevResult };
            currResult[`#key${Object.keys(prevResult).length}`] = key;
            return currResult;
        }, {});
    }
    ConstructExpressionAttributeValuesFromObj(jsonObj)
    {
        return  Object.keys(jsonObj).sort().reduce((prevResult, key) => {
            const currResult = { ...prevResult };
            currResult[`:value${Object.keys(prevResult).length}`] = jsonObj[key];
            return currResult;
        }, {});
    }
    
    /**
     * Get ProjectionExpression for query db table
     * @param {*} theObject - can be array or json object
     */
    ConstructProjectionExpressionFromObj(theObject)
    {
        return Object.keys(theObject).sort().map((_, i) => `#key${i}`).join(', ');
    }

    /**
     * Get ExpressionAttributeNames from array of strings
     * @param {*} theArray - array of strings
     */
    ConstructExpressionAttributeNamesFromArray(theArray)
    {
        return Object.values(theArray).sort().reduce((prevResult, key) => 
        {
            const currResult = { ...prevResult };
            currResult[`#key${Object.keys(prevResult).length}`] = key;
            return currResult;
        }, {});
    }
    ConstructProjectExpressionFromArray(theArray)
    {
        let projectExp = "";
        if( theArray && theArray.length > 0)
        {
            projectExp = Object.keys(theArray).sort().map((_, i) => `#key${i}`).join(', ');
        }
        return projectExp;
    }

    ConstructConditionExpressionForStringsetFromArray(attributeNameToUpdate, entries)
    {
        return entries.reduce((condition, current)=>
        {
            if( condition )
            {
                condition += " and ";
            }
            condition += "".format("NOT contains(#{0}, :value{1})", attributeNameToUpdate, entries.indexOf(current));
            return condition;
        }, "");
    }
    /**
     * Replace some of key names of an object
     * @param {*} obj - the obj that key need to be renamed 
     * @param {*} keysMap - list of originKey newKey pairs, here are sample data structure
     * {
     *       user_name: "userName",
     *       folder_name: "folderName",
     *       user_email: "userEmail",
     * };
     */
    RenameObjKeyNames(obj, keysMap)
    {
        return Object.keys(obj).reduce(
          (acc, key) => ({
            ...acc,
            ...{ [keysMap[key] || key]: obj[key] }
          }),
          {}
        );  
    }

    /**
     * Remove all specified keys and return an object with rest of keys
     * @param{*} obj - obj with properties
     * @param{*} keysToRemove - the list of keys to remove
     */
    RemoveKeysFromObj(obj, keysToRemove)
    {
        if( !obj || !keysToRemove || keysToRemove.lenght === 0)
        {
            return obj;
        }
        
        console.log("".format("Remove following properties '[{0}]'", keysToRemove));

        return {
            ...Object.keys(obj).filter(key=>!keysToRemove.includes(key)).reduce((newObj, key)=>{
                return {...newObj, [key]:obj[key]};
            }, {})
        };
    }

    /**
     * Get an object with keys specified in param keysToKeep
     * @param{*} obj - original object
     * @param{*} keysToKeep -  a list of key names to keep
     */
    GetObjWithKeysInList(obj, keysToKeep)
    {
        if( !obj || !keysToKeep || keysToKeep.lenght === 0)
        {
            return {};
        }
        console.log("".format("Keep only following properties '[{0}]'", keysToKeep));

        return {
            ...Object.keys(obj).filter(key=>keysToKeep.includes(key)).reduce((newObj, key)=>{
                return {...newObj, [key]:obj[key]};
            }, {})
        };
    }
    /**
     * Get objects with only properties listed in param keysToKeep from an object array
     * @param{*} objArray- original object array
     * @param{*} keysToKeep -  a list of key names to keep
     */
    GetObjsWithKeysInListForArray(objArray, keysToKeep)
    {
        if( !objArray || objArray.length === 0 )
        {
            return objArray;
        }
        const retArray = [];
        for(const obj of objArray)
        {
            retArray.push(this.GetObjWithKeysInList(obj, keysToKeep));
        }
        return retArray;
    }
    /**
     * return all objects that contains the key
     * @param {*} objs 
     * @param {*} keyToCheck 
     * @returns 
     */
    GetObjsWithAKeyInIt(objs, keyToCheck)
    {
        return objs && objs.filter(item=>Object.keys(item).includes(keyToCheck));
    }
    /**
     * Get object keys with the same data type specified by dataType
     * @param {*} inputObjs - it has the following format
     *  inputObjs = {
        "id":       {required: true, dataType:"string"},
        "currency": {required: true, dataType:"string"},
        "region":   {required: true, dataType:"string"},
        "startTime":     {required: true, dataType:"string"},
        "expiredTime":   {required: true, dataType:"string"},
        "description":   {required: true, dataType:"string"},
        "bMonthly":      {required: true, dataType:"boolean"},
        "displayName":   {required: false, dataType:"string"},
    };
     * @param {*} dataType 
     */
    GetObjsKeysWithADataType(inputObjs, dataType)
    {
        return inputObjs && Object.keys(inputObjs).filter(key=>{return (inputObjs[key].dataType).toLowerCase() === dataType.toLowerCase();});
    }

    /**
    * get objects with property (keyName) === keyValues
    * @param {*} inputObjects - input object array
    * @param {*} keyName - name of the key we consider
    * @param {*} keyValue - the value of the key
    */
    GetObjectsWithKeyEqual2ValueInArray(inputObjects, keyName, keyValue)
    {
        return inputObjects && inputObjects.filter((item)=>{return item[keyName] === keyValue;});
    }

   /**
    * get objects with property (keyName) !== keyValues
    * @param {*} inputObjects - input object array
    * @param {*} keyName - name of the key we consider
    * @param {*} keyValue - the value of the key
    */
    GetObjectsWithKeyNotEqual2ValueInArray(inputObjects, keyName, keyValue)
    {
        return inputObjects && inputObjects.filter((item)=>{return item[keyName] !== keyValue;});
    }

    GetKeyValuesInObjCollections(inputObjects, keyName)
    {
        return inputObjects && inputObjects.filter(item=>item[keyName] != null).map(item=>item[keyName]);
    }
    /**
     * Find the element in the collection. If the collection is simple array of simple type, i.e. array of strings or array of numbers, then keyName is null or empty.
     * If the collection is array of objects, then keyName cannot be empty
     * 
     * @param {*} collections - the array of objects
     * @param {*} keyName - key name for the objects, can be null if the collection is array of simple data type
     * @param {*} keyValue - the value of the key of the object
     */
    FindItemInCollection(collections, keyName, keyValue)
    {
        return collections && collections.find(item=>{ return item===keyValue || item[keyName] === keyValue;});
    }

    /**
     * Find the first item in the collections with subProps in the item
     * @param {*} collections - collection of objects
     * @param {*} subKeyVals - key value pairs, the subset of the property and values in the item
     */
    FindFirstItemInObjCollection(collections, subKeyVals)
    {
        const keys = Object.keys(subKeyVals);
        if( !collections || collections.length === 0 || !subKeyVals || keys.length === 0)
        {
            return null;
        }
        return collections.find(item=>
        {
            for(const key of keys)
            {
                if( item[key] !== subKeyVals[key] )
                {
                    return false;
                }
            }
            return true;
        });
    }
    /**
     * Find the element in the collection with the key value STRING type. If the collection is simple array of simple type, i.e. array of strings, then keyName is null or empty.
     * If the collection is array of objects, then keyName cannot be empty
     * 
     * @param {*} collections - the array of objects
     * @param {*} keyName - key name for the objects, can be null if the collection is array of simple data type
     * @param {*} keyValue - the value of the key of the object
     */
    FindItemInCollectionIgnoreCase(collection, keyName, keyValue)
    {
        return collection && collection.find(item=>{ return (item && item.toString().toLowerCase()===keyValue.toLowerCase()) || (item[keyName] && item[keyName].toString().toLowerCase() === keyValue.toLowerCase());});
    }
    
    /**
     * get the extension from the input string
     * @param {*} input 
     */
    GetExtension(input)
    {
        return input && this.IsObjString(input) && input.lastIndexOf('.') >=0 ? input.substring(input.lastIndexOf('.'), input.length) : "";
    }

    FindItemExtInCollectionIgnoreCase(collections, keyName, extValue)
    {
        return collections && collections.find(item=>{ return this.GetEndOfString(item, extValue).toLowerCase()===extValue.toLowerCase() || this.GetEndOfString(item[keyName], extValue).toLowerCase() === extValue.toLowerCase();});
    }
    /**
     * Get part of string from the index of "lastPart" to the end,
     * i.e. input= "someting.what.where.how.extra", and lastPart = ".where.how", it will return .where.how.extra
     * @param {*} input - original string
     * @param {*} lastPart - sub string we are looking for
     */
    GetEndOfString(input, lastPart)
    {
        return input && this.IsObjString(input) && input.lastIndexOf(lastPart) >= 0 ? input.substring(input.lastIndexOf(lastPart), input.length) : "";
    }

    IsObjString(obj)
    {
        return (typeof(obj) === "string") || (obj instanceof String);
    }

    IsObjNumber(obj)
    {
        return (typeof(obj) === "number") || (obj instanceof Number);
    }

    IsNumber(strVal) 
    { 
        return /^-?[\d.]+(?:e-?\d+)?$/.test(strVal); 
    }

    IsObjBoolean(obj)
    {
        return (typeof(obj) === "boolean") || (obj instanceof Boolean);
    }
    IsObjArray(obj)
    {
        return obj && Array.isArray(obj);
    }
    FindEmptyKeys(obj)
    {
        if( obj === null || obj === undefined || this.IsObjString(obj) || this.IsObjNumber(obj) || this.IsObjBoolean(obj))
        {
            return [];
        }

        let emptyKeys = [];
        const allKeys = Object.keys(obj);
        for( const key of allKeys)
        {
            if( obj[key] && typeof obj[key] === "object")
            {
                const emptyObj = this.FindEmptyKeys(obj[key]);
                if( emptyObj.length > 0)
                {
                    emptyKeys.push("".format("{0}->{{1}}", key, emptyObj));
                }
            }
            else if( !this.IsObjNumber(obj[key]) && !this.IsObjBoolean(obj[key]) && (this.IsObjString(obj[key]) && !obj[key].trim()))
            {
                emptyKeys.push(key);
            }
        }
        return emptyKeys;
    }

    /**
     * 
     * @param {*} arrayObj - array of simple data type like numbe, bool, and string
     */
    FindDuplicatesInArray(arrayObj)
    {
       return arrayObj && arrayObj.filter((a, index) => arrayObj.indexOf(a) !== index);
    }
    /**
     * Get all unique string and get rid of duplicates (keep one in all same duplicates), 
     * i.e input= [1, 2, 1, 3, 2, 3], the output would be = [1, 2, 3]
     * @param {*} arrayObj - array of simple type, like, number, string or boolean
     */
    FindUniqueItemsInArray(arrayObj)
    {
        return arrayObj && arrayObj.filter((a, index) => arrayObj.indexOf(a) === index);
    }

    /**
     * format a number to string in the format 00001, 00090, so it would be nice
     * @param {*} number - input integer
     * @param {*} minimumDigit - number of digit in the outputs
     */
    FormatNumString(number, minimumDigit=5)
    {
        return number.toLocaleString("en-us", {minimumIntegerDigits: minimumDigit, useGrouping : false});
    }

    FormatNumberToDecimalPoint(number, numDecimalPoint)
    {
        const numberToMultiply = Math.pow(10, numDecimalPoint);
        return (Math.round(number * numberToMultiply) / numberToMultiply);
    }

    Decode64Base(inputData)
    {
        let buff = Buffer.from(inputData, 'base64');
        let text = buff.toString('ascii');
        return text;
    }

    Encode64Base(text)
    {
        let buff = Buffer.from(text);
        let base64data = buff.toString('base64');
        return base64data;
    }
    /**
     * change string in the array to the lower or upper case
     */
    ChangeArrayToCase(strArrays, isToUpperCase=false)
    {
        return strArrays && strArrays.map(value=>
        {
            if( this.IsObjString(value))
            {
                return isToUpperCase ? value.toUpperCase() : value.toLowerCase();
            }
            else
            {
                return value;
            }
        });
    }

    FormatArrayToString(objArrays)
    {
        if( !objArrays || objArrays.length === 0 )
        {
            return "";
        }
        return (objArrays.reduce((res, current)=> {res += (", " + current ); return res; })).trim();
    }

    /**
     * Add arrays' element together, keep num of elements as first array1, extra elements in oter arrays ignored
     * @param {*} numDecimal - number of decimap point to keep
     * @param {*} array1 - 2nd element on are arrays
     * @returns 
     */
    AddArrayElementsFromArrays(numDecimal, array1, )
    {
        if( arguments.length < 3)
        {
            return array1;
        }
        
        let arrays = [];
        let arrayWithMostElements = [];
        let previousaArayWithMostElements = [];
        for(let i=1; i<arguments.length; i++)
        {
            if( arguments[i] )
            {
                if( arguments[i].length > arrayWithMostElements.length )
                {
                    previousaArayWithMostElements = arrayWithMostElements;
                    arrayWithMostElements = arguments[i];
                }
                else
                {
                    arrays.push(arguments[i]);
                }
                if( previousaArayWithMostElements.length !== 0 )
                {
                    arrays.push(previousaArayWithMostElements);
                    previousaArayWithMostElements = [];
                }
            }
        }
        const formatNumHandler = this.FormatNumberToDecimalPoint.bind(this);
        var sum = arrayWithMostElements.map(function (num, idx) 
        {
            return formatNumHandler(num + arrays.reduce((a, b) => b[idx] ? a + b[idx] : a, 0), numDecimal);
        });
        return sum;
    }

    /**
     * Since node type full and fullPlus does not have different unit prices, so we need to convert FullPlus to Full 
     * @param {*} nodeType 
     * @returns 
     */
    ConvertSpecialNodeTypeToNormal(nodeType)
    {
        switch(nodeType)
        {
            case Consts.Node.FullPlus:
                return Consts.Node.Full;
            case Consts.Node.HalfPlus:
                return Consts.Node.Half;
            case Consts.Node.MegaPlus:
                return Consts.Node.Mega;
            default:
                return nodeType;
        }
    }
    ConvertSpecialNodeTypeToReadable(nodeType)
    {
        switch(nodeType)
        {
            case Consts.Node.FullPlus:
                return "fullPlus";
            case Consts.Node.HalfPlus:
                return "halfPlus";
            case Consts.Node.MegaPlus:
                return "megaPlus";
            default:
                return nodeType;
        }
    }
    IsMpiSimulator(sim)
    {
        switch(sim)
        {
            case Consts.Simulators.GemMpi:
            case Consts.Simulators.StarsMpi:
            case Consts.Simulators.ImexMpi:
                return true;
            default:
                return false;
        }
    }
    
    ConvertBoolToString(obj)
    {
        const {...objCopy} = obj;
        
        const array_constructor = [].constructor;
        const object_constructor = ({}).constructor;
        const boolean_constructor = true.constructor;

        for(const key of Object.keys(objCopy))
        {
            const constructorOfValue = objCopy[key].constructor;
            if( constructorOfValue === object_constructor )
            {
                objCopy[key]= this.ConvertBoolToString(objCopy[key]);
            }
            else if( constructorOfValue === array_constructor )
            {
                for(let i=0; i<objCopy[key].length; i++)
                {
                    if( objCopy[key][i].constructor === object_constructor )
                    {
                        objCopy[key][i] = this.ConvertBoolToString(objCopy[key][i]);
                    }
                    else if( objCopy[key][i].constructor === boolean_constructor )
                    {
                        objCopy[key][i] = objCopy[key][i].toString();
                    }
                }
            }
            else if( constructorOfValue === boolean_constructor )
            {
                objCopy[key] = objCopy[key].toString();
            }
        }
        
        return objCopy;
    }

    /**
     * The input data is a compressed list of the license inforamtion, we want to get latest and return with json format. It returns in the following format:
     * {    
     *      "time":"2022-07-20T22:38:07Z",
     *      "gem": 0,
     *      "imex": 0,
     *      "stars": 40,
     *      ... 
     * }
     * @param {*} inputLicData - compressed data, with array of information like:["time":"2022-07-20T22:38:07Z","licVal":"22 gem 0 imex 0 stars 20 gem_parallel 0 imex_parallel 0 stars_parallel 0 gem_mpi 0 imex_mpi 0 stars_mpi 0 gem_mpi_hosts 0 imex_mpi_hosts 0 stars_mpi_hosts 0 gem_mpi_parallel 0 imex_mpi_parallel 0 stars_mpi_parallel 0 results 0 dynagrid 0 isegwell 0 combinative 40 max_gem_gridblocks 0 max_imex_gridblocks 0 max_stars_gridblocks 4294967295 "]
     */
    DeserializeLicData(inputLicData, timeName, licValName)
    {
        if( inputLicData == null || inputLicData.length === 0 )
        {
            return {};
        }
        let inputDecompressed = this.DecompressWithEncode(inputLicData);
        if( inputDecompressed == null || inputDecompressed.length === 0)
        {
            return {};
        }
        //make sure we get latest so we want to sort the data accouding to time in the asscending order
        let mySortingFun = this.CompareFun.bind(this);
        inputDecompressed = inputDecompressed.sort(function(item1, item2){return mySortingFun(item1[timeName], item2[timeName]);});
        let outputJson = {};
        if( inputDecompressed.length > 0 )
        {
            const latestItem = inputDecompressed[inputDecompressed.length-1];
            outputJson = {time: this.Epoch(latestItem[timeName], true),...latestItem[licValName]};
        }
        
        return outputJson;
    }
    AssembleMessage(errorMsgs, noErrorMsg="No error")
    {
        if( !errorMsgs || errorMsgs.length === 0 )
        {
            return {[Consts.RetObjProp.StatusCode] : 200, [Consts.RetObjProp.Message]: noErrorMsg, [Consts.RetObjProp.Body]:{[Consts.RetObjProp.Message]:noErrorMsg}};
        }

        const assembledMsg = errorMsgs.reduce((finalMsg, current)=>{finalMsg += (" " + current.trimLR([".", ","]) + ".");  return finalMsg;},"");

        return {[Consts.RetObjProp.StatusCode] : 400, [Consts.RetObjProp.Message]: assembledMsg.trim(), [Consts.RetObjProp.Body]:{[Consts.RetObjProp.Error]:assembledMsg.trim()}};
    }

    WrapCallback(result, callback)
    {

        let response = 
        {
            [Consts.RetObjProp.StatusCode]: result[Consts.RetObjProp.StatusCode],
            [Consts.RetObjProp.Body]: JSON.stringify(result[Consts.RetObjProp.Body]),
            headers: 
            {
                "Access-Control-Allow-Origin" : "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS, PUT, PATCH, DELETE",
                "Access-Control-Allow-Headers": "Content-Type, Origin, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token, Access-Control-Allow-Headers, X-Requested-With, Access-Control-Allow-Origin"
            }
        };
        
        if( result[Consts.RetObjProp.StatusCode] !== 200 && result[Consts.RetObjProp.StatusCode] !== 201 && result[Consts.RetObjProp.StatusCode] !== 202)
        {
            response[Consts.RetObjProp.Body] = JSON.stringify({'error':result[Consts.RetObjProp.Message]});
        }
        
        if( !response[Consts.RetObjProp.Body] )
        {
            response[Consts.RetObjProp.Body] = result[Consts.RetObjProp.Message];
        }
        callback(null, response);
    }
    /**
     * Wrapp http response
     * @param {*} retObj - object with{statusCode: 400, message: "some message", "body":someData}
     * @param {*} res - reponse from http
     */
    WrapTableOperationResponse(retObj, res)
    {
        console.log(retObj[Consts.RetObjProp.Message]);
        let responseObj = { error: retObj[Consts.RetObjProp.Message] };
        if (retObj[Consts.RetObjProp.StatusCode] === 200 ||
            retObj[Consts.RetObjProp.StatusCode] === 201) 
        {
            responseObj = retObj[Consts.RetObjProp.Body];
        }
        res.status(retObj[Consts.RetObjProp.StatusCode]).send(responseObj);
    }
}


function hasAnyProperty(obj)
{
    if( !obj )
    {
        return false;
    }

    for(let prop in obj)
    {
        if( obj.hasOwnProperty(prop))
        {
            return true;
        }
    }
    return false;
}

exports.CommonHelper = CommonHelper;