var ShapedScripts =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

		'use strict';
	var roll20 = __webpack_require__(1);
	var parseModule = __webpack_require__(2);
	var mmFormat = __webpack_require__(4);
	var myState = roll20.getState('ShapedScripts');
	var logger = __webpack_require__(5)(myState.config);
	var entityLookup = __webpack_require__(6);
	var shaped = __webpack_require__(8)(logger, myState, roll20, parseModule.getParser(mmFormat, logger), entityLookup);
	var _ = __webpack_require__(3);

	logger.wrapModule(entityLookup);
	logger.wrapModule(roll20);

		var jsonValidator = __webpack_require__(13)(__webpack_require__(4));

		entityLookup.configureEntity('monsters', [entityLookup.wrapJsonValidator(jsonValidator), entityLookup.spellHydrator.bind(entityLookup)]);
		entityLookup.configureEntity('spells', [entityLookup.monsterSpellUpdater.bind(entityLookup)]);

		roll20.on('ready', function () {
			shaped.checkInstall();
			shaped.registerEventHandlers();
		});

		module.exports = {
			addEntities: function (entities) {
				try {
					if (typeof entities === 'string') {
						entities = JSON.parse(entities);
					}
					var result = entityLookup.addEntities(entities);
					var summary = _.mapObject(result, function (propVal, propName) {
						if (propName === 'errors') {
							return propVal.length;
						}
						else {
							return _.mapObject(propVal, function (array) {
								return array.length;
							});
						}
					});
					logger.info('Summary of adding entities to the lookup: $$$', summary);
					logger.info('Details: $$$', result);
					if (!_.isEmpty(result.errors)) {
						var message = _.chain(result.errors)
						.groupBy('entity')
						.mapObject(function (entityErrors) {
							return _.chain(entityErrors)
							.pluck('errors')
							.flatten()
							.value();
						})
						.map(function (errors, entityName) {
							return '<li>' + entityName + ':<ul><li>' + errors.join('</li><li>') + '</li></ul></li>';
						})
						.value();

						roll20.sendChat('ShapedScripts', '/w gm <div><h3>Errors occurred importing information from JSON files:</h3> <ul>' + message + '</ul></div>');
					}
	        }
				catch (e) {
					roll20.sendChat('Shaped Scripts', '/w gm Error adding spells or monsters: ' + e);
					logger.error(e.toString());
					logger.error(e.stack);
	        }
	    }
	};


/***/ },
/* 1 */
/***/ function(module, exports) {

	/* globals state, createObj, findObjs, getObj, getAttrByName, sendChat, on, log */
	//noinspection JSUnusedGlobalSymbols
	module.exports = {

	    getState: function (module) {
	        'use strict';
	        if (!state[module]) {
	            state[module] = {};
	        }
	        return state[module];
	    },

	    createObj: function (type, attributes) {
	        'use strict';
	        return createObj(type, attributes);
	    },

	    findObjs: function (attributes) {
	        'use strict';
	        return findObjs(attributes);
	    },

	    getObj: function (type, id) {
	        'use strict';
	        return getObj(type, id);
	    },

	    getAttrByName: function (character, attrName) {
	        'use strict';
	        return getAttrByName(character, attrName);
	    },

	    getAttrObjectByName: function (character, attrName) {
	        'use strict';
	        var attr = this.findObjs({type: 'attribute', characterid: character, name: attrName});
	        return attr && attr.length > 0 ? attr[0] : null;
	    },

	    getOrCreateAttr: function (characterId, attrName) {
	        'use strict';
	        var attrSpec = {type: 'attribute', characterid: characterId, name: attrName};
	        var attribute = this.findObjs(attrSpec);
	        switch (attribute.length) {
	            case 0:
	                return this.createObj('attribute', attrSpec);
	            case 1:
	                return attribute[0];
	            default:
	                throw new Error('Asked for a single attribute [' + attrName + '] for character [' + characterId + '] but more than one found');
	        }
	    },

	    setAttrByName: function (characterId, attrName, value) {
	        'use strict';
	        this.getOrCreateAttr(characterId, attrName).set('current', value);
	    },

	    processAttrValue: function (characterId, attrName, cb) {
	        'use strict';
	        var attribute = this.getOrCreateAttr(characterId, attrName);
	        attribute.set('current', cb(attribute.get('current')));
	    },

	    sendChat: function (sendAs, message, callback, options) {
	        'use strict';
	        return sendChat(sendAs, message, callback, options);
	    },

	    on: function (event, callback) {
	        'use strict';
	        return on(event, callback);
	    },

	    log: function (msg) {
	        'use strict';
	        return log(msg);
	    },

	    logWrap: 'roll20'
	};


/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

	/**
	 * A specification of a field that can appear
	 * in the format that this parser processes
	 * @typedef {Object} FieldSpec
	 * @property {FieldSpec[]} [contentModel] - list of child fieldSpecs for complex content
	 * @property {boolean} [bare] - if true this field appears as a bare value with no parseToken in front of it
	 * @property {string} [parseToken] - the token that defines the beginning of this field (usually case insensitive). Not used for bare tokens.
	 * @property {string} [pattern] - a pattern that defines the value of this field. For bare properties this will determine
	 *                                  if the field matches at all, whereas for normal ones this will just be used to validate them
	 * @property {number} [forNextMatchGroup] - the 1-based index of the match group from the supplied pattern that will contain text that
	 *                                          should be handed to the next parser rather than used as part of this field.
	 * @property {number} [forPreviousMatchGroup] - the 1-based index of the match group from the supplied pattern that will contain text that
	 *                                          should be handed to the previous parser to complete its value rather than used as part of this field.
	 *                                          Only applicable to
	 *                                          bare properties, since ones with a token have a clearly defined start based on the parseToken
	 * @property {number} [matchGroup=0] - the index of the capturing group in the supplied pattern to use as the value for this field. If left at the
	 *                                      default of 0, the whole match will be used.
	 * @property {boolean} [caseSensitive=false] - If true, the pattern used for the value of this field will be made case sensitive. Note
	 *                                        that parseToken matching is always case insensitive.
	 * @property {string} type - the type of this field. Currently valid values are [orderedContent, unorderedContent, string, enumType, integer, abililty]
	 * @property {string[]} enumValues - an array of valid values for this field if the type is enumType
	 * @property {number} [minOccurs=1] - the minimum number of times this field should occur in the parent content model.
	 * @property {number} [maxOccurs=1] - the maximum number of times this field should occur in the parent content model.
	 */


	/**
	 *
	 * @param {FieldSpec} formatSpec - Root format specification for this parser
	 * @param logger - Logger object to use for reporting errors etc.
	 * @returns {{parse:parse}} - A parser that will process text in the format specified by the supplied formatSpec into JSON objects
	 */
	function getParser(formatSpec, logger) {
	    'use strict';


	    //noinspection JSUnusedGlobalSymbols
	    var parserModule = {

	        makeContentModelParser: function (fieldSpec, ordered) {
	            var module = this;
	            return {

	                parse: function (stateManager, textLines, resume) {

	                    var parseState = stateManager.enterChildParser(this, resume),
	                        someMatch = false,
	                        canContinue,
	                        stopParser = null;

	                    parseState.subParsers = parseState.subParsers || module.makeParserList(fieldSpec.contentModel);


	                    if (parseState.resumeParser) {
	                        if (!parseState.resumeParser.resumeParse(stateManager, textLines)) {
	                            stateManager.leaveChildParser(this);
	                            return false;
	                        }

	                        someMatch = true;

	                    }

	                    var parseRunner = function (parser, index, parsers) {

	                        if (!parser.parse(stateManager, textLines)) {

	                            if (parser.required === 0 || !ordered) {
	                                //No match but it's ok to keep looking
	                                //through the rest of the content model for one
	                                return false;
	                            }

	                            //No match but one was required here by the content model
	                        }
	                        else {
	                            parser.justMatched = true;
	                            if (parser.required > 0) {
	                                parser.required--;
	                            }
	                            parser.allowed--;
	                            if (ordered) {
	                                //Set all the previous parsers to be exhausted since we've matched
	                                //this one and we're in a strictly ordered content model.
	                                _.each(parsers.slice(0, index), _.partial(_.extend, _, {allowed: 0}));
	                            }
	                        }
	                        return true;
	                    };

	                    do {

	                        stopParser = _.find(parseState.subParsers, parseRunner);
	                        logger.debug('Stopped at parser $$$', stopParser);
	                        canContinue = stopParser && stopParser.justMatched;
	                        if (stopParser) {
	                            someMatch = someMatch || stopParser.justMatched;
	                            stopParser.justMatched = false;
	                        }

	                        //Lose any parsers that have used up all their cardinality already
	                        parseState.subParsers = _.reject(parseState.subParsers, {allowed: 0});

	                    } while (!_.isEmpty(parseState.subParsers) && !_.isEmpty(textLines) && canContinue);

	                    stateManager.leaveChildParser(this, someMatch ? parseState : undefined);

	                    return someMatch;
	                },

	                resumeParse: function (stateManager, textLines) {
	                    return this.parse(stateManager, textLines, true);
	                },
	                complete: function (parseState, finalText) {
	                    var missingContent = _.filter(parseState.subParsers, 'required');
	                    if (!_.isEmpty(missingContent)) {
	                        throw new MissingContentError(missingContent);
	                    }
	                }
	            };
	        },

	        matchParseToken: function (myParseState, textLines) {
	            if (_.isEmpty(textLines) || this.bare) {
	                return !_.isEmpty(textLines);
	            }

	            var re = new RegExp('^(.*?)(' + this.parseToken + ')(?:[\\s.]+|$)', 'i');
	            var match = textLines[0].match(re);
	            if (match) {
	                logger.debug('Found match $$$', match[0]);
	                myParseState.forPrevious = match[1];
	                myParseState.text = '';
	                textLines[0] = textLines[0].slice(match[0].length).trim();
	                if (!textLines[0]) {
	                    textLines.shift();
	                }
	            }

	            return !!match;
	        },

	        matchValue: function (myParseState, textLines) {
	            if (this.pattern && this.bare) {
	                //If this is not a bare value then we can take all the text up to next
	                //token and just validate it at the end. If it is, then the pattern itself
	                //defines whether this field matches and we must run it immediately.

	                if (_.isEmpty(textLines)) {
	                    return false;
	                }
	                textLines[0] = textLines[0].trim();

	                var matchGroup = this.matchGroup || 0;
	                var re = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
	                logger.debug('$$$ attempting to match value [$$$] against regexp $$$', this.name, textLines[0], re.toString());
	                var match = textLines[0].match(re);

	                if (match) {
	                    logger.debug('Successful match! $$$', match);
	                    myParseState.text = match[matchGroup];
	                    if (!myParseState.forPrevious && this.forPreviousMatchGroup) {
	                        logger.debug('Setting forPrevious to  $$$', match[this.forPreviousMatchGroup]);
	                        myParseState.forPrevious = match[this.forPreviousMatchGroup];
	                    }
	                    textLines[0] = textLines[0].slice(match.index + match[0].length);
	                    if (this.forNextMatchGroup && match[this.forNextMatchGroup]) {
	                        textLines[0] = match[this.forNextMatchGroup] + textLines[0];
	                    }

	                    if (!textLines[0]) {
	                        myParseState.text += '\n';
	                        textLines.shift();
	                    }
	                    return true;
	                }
	                else {
	                    logger.debug('Match failed');
	                }
	                return false;
	            }
	            else {
	                logger.debug('$$$ standard string match, not using pattern', this.name);
	                myParseState.text = '';
	                return true;
	            }

	        },

	        orderedContent: function (fieldSpec) {
	            return this.makeContentModelParser(fieldSpec, true);
	        },

	        unorderedContent: function (fieldSpec) {
	            return this.makeContentModelParser(fieldSpec, false);
	        },

	        string: function (fieldSpec) {
	            return this.makeSimpleValueParser();
	        },


	        enumType: function (fieldSpec) {
	            var parser = this.makeSimpleValueParser();

	            if (fieldSpec.bare) {
	                parser.matchValue = function (myParseState, textLines) {
	                    var parser = this;
	                    var firstMatch = _.chain(fieldSpec.enumValues)
	                        .map(function (enumValue) {
	                            logger.debug('Attempting to parse as enum property $$$', enumValue);
	                            var pattern = '^(.*?)(' + enumValue + ')(?:[\\s.]+|$)';
	                            var re = new RegExp(pattern, parser.caseSensitive ? '' : 'i');
	                            return textLines[0].match(re);
	                        })
	                        .compact()
	                        .sortBy(function (match) {
	                            return match[1].length;
	                        })
	                        .first()
	                        .value();


	                    if (firstMatch) {
	                        logger.debug('Finished trying to parse as enum property, match: $$$', firstMatch);
	                        myParseState.text = firstMatch[2];
	                        myParseState.forPrevious = firstMatch[1];
	                        textLines[0] = textLines[0].slice(firstMatch.index + firstMatch[0].length);
	                        if (!textLines[0]) {
	                            textLines.shift();
	                        }
	                        return true;
	                    }
	                    return false;

	                };
	            }
	            return parser;
	        },

	        number: function (fieldSpec) {
	            var parser = this.makeSimpleValueParser();
	            parser.typeConvert = function (textValue) {
	                var parts = textValue.split('/');
	                var intVal;
	                if (parts.length > 1) {
	                    intVal = parts[0] / parts[1];
	                }
	                else {
	                    intVal = parseInt(textValue);
	                }

	                if (_.isNaN(intVal)) {
	                    throw new BadValueError(fieldSpec.name, textValue, '[Integer]');
	                }
	                return intVal;
	            };
	            return parser;
	        },


	        ability: function (fieldSpec) {
	            var parser = this.number();
	            parser.matchValue = function (parseState, textLines) {
	                if (_.isEmpty(textLines)) {
	                    return false;
	                }
	                var re = new RegExp('^([\\sa-z\\(\\)]*)(\\d+(?:\\s?\\([\\-+\\d]+\\))?)', 'i');
	                logger.debug('Attempting to match value [$$$] against regexp $$$', textLines[0].trim(), re.toString());
	                var match = textLines[0].trim().match(re);

	                if (match) {
	                    logger.debug('Successful match $$$', match);
	                    parseState.text = match[2];
	                    textLines[0] = match[1] + textLines[0].slice(match.index + match[0].length);
	                    if (!textLines[0]) {
	                        textLines.shift();
	                    }
	                    return true;
	                }
	                return false;
	            };

	            return parser;
	        },

	        heading: function (fieldSpec) {
	            fieldSpec.bare = true;
	            var parser = this.makeSimpleValueParser();
	            parser.skipOutput = true;
	            return parser;
	        },

	        makeSimpleValueParser: function () {
	            var module = this;
	            return {
	                parse: function (stateManager, textLines) {
	                    var parseState = stateManager.enterChildParser(this);
	                    var match = this.matchParseToken(parseState, textLines) &&
	                        this.matchValue(parseState, textLines);
	                    if (match) {
	                        stateManager.completeCurrentStack(parseState.forPrevious);
	                        delete parseState.forPrevious;
	                        stateManager.leaveChildParser(this, parseState);
	                    }
	                    else {
	                        stateManager.leaveChildParser(this);
	                    }
	                    return match;
	                },
	                complete: function (parseState, finalText) {
	                    parseState.text += finalText ? finalText : '';
	                    if (parseState.text) {
	                        parseState.value = this.extractValue(parseState.text);
	                        parseState.value = this.typeConvert(parseState.value);
	                        parseState.setOutputValue();
	                    }
	                },
	                extractValue: function (text) {
	                    text = text.trim();
	                    if (this.pattern && !this.bare) {


	                        var regExp = new RegExp(this.pattern, this.caseSensitive ? '' : 'i');
	                        var match = text.match(regExp);
	                        if (match) {
	                            var matchGroup = this.matchGroup || 0;
	                            return match[matchGroup];
	                        }
	                        else {
	                            throw new BadValueError(this.name, text, regExp);
	                        }
	                    }
	                    else {
	                        return text;
	                    }
	                },
	                typeConvert: function (textValue) {
	                    return textValue;
	                },
	                resumeParse: function (stateManager, textLines) {
	                    if (_.isEmpty(textLines)) {
	                        return false;
	                    }
	                    var parseState = stateManager.enterChildParser(this, true);
	                    parseState.text += textLines.shift() + '\n';
	                    stateManager.leaveChildParser(this, parseState);
	                    return true;
	                },
	                matchParseToken: module.matchParseToken,
	                matchValue: module.matchValue
	            };
	        },

	        makeBaseParseState: function (skipOutput, propertyPath, outputObject, completedObjects) {
	            return {
	                text: '',
	                getObjectValue: function () {
	                    var value = outputObject;
	                    var segments = _.clone(propertyPath);
	                    while (segments.length) {
	                        var prop = segments.shift();
	                        if (prop.flatten) {
	                            continue;
	                        }
	                        value = value[prop.name];
	                        if (_.isArray(value)) {
	                            value = _.last(value);
	                        }
	                    }
	                    return value;
	                },
	                setOutputValue: function () {
	                    if (skipOutput) {
	                        return;
	                    }
	                    var outputTo = outputObject;
	                    var segments = _.clone(propertyPath);
	                    while (segments.length > 0) {
	                        var prop = segments.shift();
	                        if (prop.flatten) {
	                            continue;
	                        }

	                        var currentValue = outputTo[prop.name];
	                        var newValue = segments.length === 0 ? this.value : {};

	                        if (_.isUndefined(currentValue) && prop.allowed > 1) {
	                            currentValue = [];
	                            outputTo[prop.name] = currentValue;
	                        }

	                        if (_.isArray(currentValue)) {
	                            var arrayItem = _.find(currentValue, _.partial(_.negate(_.contains), completedObjects));
	                            if (!arrayItem) {
	                                currentValue.push(newValue);
	                                arrayItem = _.last(currentValue);
	                            }
	                            newValue = arrayItem;
	                        }
	                        else if (_.isUndefined(currentValue)) {
	                            outputTo[prop.name] = newValue;
	                        }
	                        else if (segments.length === 0) {
	                            throw new Error('Simple value property somehow already had value when we came to set it');
	                        }
	                        else {
	                            newValue = currentValue;
	                        }

	                        outputTo = newValue;
	                    }
	                },
	                logWrap: 'parseState[' + _.pluck(propertyPath, 'name').join('/') + ']',
	                toJSON: function () {
	                    return _.extend(_.clone(this), {propertyPath: propertyPath});
	                }
	            };
	        },

	        makeParseStateManager: function () {
	            var incompleteParserStack = [];
	            var currentPropertyPath = [];
	            var completedObjects = [];
	            var module = this;
	            return {
	                outputObject: {},
	                leaveChildParser: function (parser, state) {
	                    currentPropertyPath.pop();
	                    if (state) {
	                        state.resumeParser = _.isEmpty(incompleteParserStack) ? null : _.last(incompleteParserStack).parser;
	                        incompleteParserStack.push({parser: parser, state: state});
	                    }
	                },
	                completeCurrentStack: function (finalText) {
	                    while (!_.isEmpty(incompleteParserStack)) {
	                        var incomplete = incompleteParserStack.shift();
	                        incomplete.parser.complete(incomplete.state, finalText);
	                        var value = incomplete.state.getObjectValue();
	                        if (_.isObject(value)) {
	                            //Crude but this list is unlikely to get that big
	                            completedObjects.push(value);
	                        }
	                    }
	                },
	                enterChildParser: function (parser, resume) {
	                    currentPropertyPath.push({
	                        name: parser.name,
	                        allowed: parser.allowed,
	                        flatten: parser.flatten
	                    });

	                    if (!resume || _.isEmpty(incompleteParserStack) || parser !== _.last(incompleteParserStack).parser) {
	                        return module.makeBaseParseState(parser.skipOutput, _.clone(currentPropertyPath), this.outputObject, completedObjects);
	                    }

	                    return incompleteParserStack.pop().state;
	                },
	                logWrap: 'parserState',
	                toJSON: function () {
	                    return _.extend(_.clone(this), {
	                        incompleteParsers: incompleteParserStack,
	                        propertyPath: currentPropertyPath
	                    });
	                }

	            };
	        },

	        parserId: 0,
	        parserAttributes: ['forPreviousMatchGroup', 'forNextMatchGroup',
	            'parseToken', 'flatten', 'pattern', 'matchGroup', 'bare', 'caseSensitive',
	            'name', 'skipOutput'],
	        getParserFor: function (fieldSpec) {
	            logger.debug('Making parser for field $$$', fieldSpec);
	            var parserBuilder = this[fieldSpec.type];
	            if (!parserBuilder) {
	                throw new Error('Can\'t make parser for type ' + fieldSpec.type);
	            }
	            var parser = parserBuilder.call(this, fieldSpec);
	            parser.required = _.isUndefined(fieldSpec.minOccurs) ? 1 : fieldSpec.minOccurs;
	            parser.allowed = _.isUndefined(fieldSpec.maxOccurs) ? 1 : fieldSpec.maxOccurs;
	            _.extend(parser, _.pick(fieldSpec, this.parserAttributes));
	            _.defaults(parser, {
	                parseToken: parser.name
	            });
	            parser.id = this.parserId++;
	            parser.logWrap = 'parser[' + parser.name + ']';
	            return parser;
	        },


	        makeParserList: function (contentModelArray) {
	            var module = this;
	            return _.chain(contentModelArray)
	                .reject('noParse')
	                .reduce(function (parsers, fieldSpec) {
	                    parsers.push(module.getParserFor(fieldSpec));
	                    return parsers;
	                }, [])
	                .value();
	        },

	        logWrap: 'parseModule'
	    };

	    logger.wrapModule(parserModule);

	    var parser = parserModule.getParserFor(formatSpec);
	    return {
	        parse: function (text) {
	            logger.debug('Text: $$$', text);

	            var textLines = _.chain(text.split('\n'))
	                .invoke('trim')
	                .compact()
	                .value();
	            logger.debug(parser);
	            var stateManager = parserModule.makeParseStateManager();
	            var success = parser.parse(stateManager, textLines);
	            while (success && !_.isEmpty(textLines)) {
	                parser.resumeParse(stateManager, textLines);
	            }

	            stateManager.completeCurrentStack(textLines.join('\n'));

	            if (success && textLines.length === 0) {
	                logger.info(stateManager.outputObject);
	                return stateManager.outputObject;
	            }
	            return null;
	        }
	    };

	}

	/**
	 * @constructor
	 */
	function ParserError(message) {
	    'use strict';
	    //noinspection JSUnusedGlobalSymbols
	    this.message = message;
	}
	ParserError.prototype = new Error();

	/**
	 * @constructor
	 */
	function MissingContentError(missingFieldParsers) {
	    'use strict';
	    this.missingFieldParsers = missingFieldParsers;
	    //noinspection JSUnusedGlobalSymbols
	    this.message = _.reduce(this.missingFieldParsers, function (memo, parser) {
	          return memo + '<li>Field ' + parser.parseToken + ' should have appeared ' + parser.required + ' more times</li>';
	      }, '<ul>') + '</ul>';
	}
	MissingContentError.prototype = new ParserError();

	/**
	 * @constructor
	 */
	function BadValueError(name, value, pattern) {
	    'use strict';
	    this.name = name;
	    this.value = value;
	    this.pattern = pattern;
	    //noinspection JSUnusedGlobalSymbols
	    this.message = 'Bad value [' + this.value + '] for field [' + this.name + ']. Should have matched pattern: ' + this.pattern;
	}
	BadValueError.prototype = new ParserError();

	module.exports = {
	    getParser: getParser,
	    MissingContentError: MissingContentError,
	    BadValueError: BadValueError,
	    ParserError: ParserError
	};


/***/ },
/* 3 */
/***/ function(module, exports) {

	module.exports = _;

/***/ },
/* 4 */
/***/ function(module, exports) {

	module.exports = {
		"name": "npc",
		"type": "orderedContent",
		"bare": true,
		"contentModel": [
			{
				"name": "coreInfo",
				"type": "orderedContent",
				"flatten": true,
				"contentModel": [
					{
						"name": "name",
						"type": "string",
						"bare": "true"
					},
					{
						"name": "size",
						"enumValues": [
							"Tiny",
							"Small",
							"Medium",
							"Large",
							"Huge",
							"Gargantuan"
						],
						"type": "enumType",
						"bare": "true"
					},
					{
						"name": "type",
						"type": "string",
						"bare": "true",
						"pattern": "^([\\w\\s\\(\\),-]+),",
						"matchGroup": 1
					},
					{
						"name": "alignment",
						"type": "enumType",
						"enumValues": [
							"lawful good",
							"lawful neutral",
							"lawful evil",
							"neutral good",
							"neutral evil",
							"neutral",
							"chaotic good",
							"chaotic neutral",
							"chaotic evil",
							"unaligned",
							"any alignment",
							"any good alignment",
							"any non-good alignment",
							"any evil alignment",
							"any non-evil alignment",
							"any lawful alignment",
							"any non-lawful alignment",
							"any chaotic alignment",
							"any non-chaotic alignment",
							"construct",
							"(?:lawful|neutral|chaotic) (?:good|neutral|evil) \\(\\d+%\\) or (?:lawful|neutral|chaotic) (?:good|neutral|evil) \\(\\d+%\\)"
						],
						"bare": true
					}
				]
			},
			{
				"name": "attributes",
				"type": "unorderedContent",
				"flatten": true,
				"contentModel": [
					{
						"name": "AC",
						"parseToken": "armor class",
						"pattern": "\\d+\\s*(?:\\([^)]*\\))?",
						"type": "string"
					},
					{
						"name": "HP",
						"parseToken": "hit points",
						"type": "string",
						"pattern": "\\d+(?:\\s?\\(\\s?\\d+d\\d+(?:\\s?[-+]\\s?\\d+)?\\s?\\))?"
					},
					{
						"name": "speed",
						"minOccurs": 0,
						"type": "string",
						"pattern": "^\\d+\\s?ft[\\.]?(,\\s?(fly|swim|burrow|climb)\\s\\d+\\s?ft[\\.]?)*(\\s?\\([^\\)]+\\))?$"
					},
					{
						"name": "strength",
						"parseToken": "str",
						"type": "ability"
					},
					{
						"name": "dexterity",
						"parseToken": "dex",
						"type": "ability"
					},
					{
						"name": "constitution",
						"parseToken": "con",
						"type": "ability"
					},
					{
						"name": "intelligence",
						"parseToken": "int",
						"type": "ability"
					},
					{
						"name": "wisdom",
						"parseToken": "wis",
						"type": "ability"
					},
					{
						"name": "charisma",
						"parseToken": "cha",
						"type": "ability"
					},
					{
						"name": "savingThrows",
						"minOccurs": 0,
						"parseToken": "saving throws",
						"type": "string",
						"pattern": "(?:(?:^|,\\s*)(?:Str|Dex|Con|Int|Wis|Cha)\\s+[\\-\\+]\\d+)+"
					},
					{
						"name": "skills",
						"minOccurs": 0,
						"type": "string",
						"pattern": "(?:(?:^|,\\s*)(?:Acrobatics|Animal Handling|Arcana|Athletics|Deception|History|Insight|Intimidation|Investigation|Medicine|Nature|Perception|Performance|Persuasion|Religion|Sleight of Hand|Stealth|Survival)\\s+[\\-\\+]\\d+)+"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "damageVulnerabilities",
						"parseToken": "damage vulnerabilities"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "damageResistances",
						"parseToken": "damage resistances"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "damageImmunities",
						"parseToken": "damage immunities"
					},
					{
						"minOccurs": 0,
						"type": "string",
						"name": "conditionImmunities",
						"parseToken": "condition immunities"
					},
					{
						"name": "senses",
						"type": "string",
						"minOccurs": 0,
						"pattern": "(?:(?:^|,\\s*)(?:blindsight|darkvision|tremorsense|truesight)\\s+\\d+\\s*ft\\.?(?: or \\d+ ft\\. while deafened)?(?:\\s?\\([^\\)]+\\))?)+"
					},
					{
						"name": "passivePerception",
						"parseToken": ",?\\s*passive Perception",
						"minOccurs": 0,
						"type": "number",
						"skipOutput": true
					},
					{
						"name": "spells",
						"minOccurs": 0,
						"type": "string"
					},
					{
						"name": "languages",
						"minOccurs": 0,
						"type": "string"
					}
				]
			},
			{
				"name": "challenge",
				"type": "string",
				"pattern": "^\\s*(\\d+(?:\\s*\\/\\s*\\d)?)\\s*(?:\\(\\s*[\\d,]+\\s*XP\\s*\\)\\s*)?$",
				"matchGroup": 1
			},
			{
				"name": "spellBook",
				"type": "string",
				"minOccurs": 0
			},
			{
				"name": "traitSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "traits",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:[A-Z][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|to|in|the|with|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"bare": true,
								"caseSensitive": true
							},
							{
								"name": "recharge",
								"type": "string",
								"pattern": "^\\(([^\\)]+)\\)",
								"bare": true,
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "actionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Actions$"
					},
					{
						"name": "actions",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:\\d+\\.\\s?)?(?:[A-Z][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|in|to|with|the|and|or|a|\\+\\d+)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"bare": true,
								"caseSensitive": true
							},
							{
								"name": "recharge",
								"type": "string",
								"bare": true,
								"pattern": "^\\(([^\\)]+)\\)",
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "reactionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "reactionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Reactions$"
					},
					{
						"name": "reactions",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:[A-Z][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|in|to|with|the|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"bare": true,
								"caseSensitive": true
							},
							{
								"name": "recharge",
								"type": "string",
								"bare": true,
								"pattern": "^\\(([^\\)]+)\\)",
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "legendaryActionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Legendary Actions$"
					},
					{
						"name": "legendaryPoints",
						"type": "number",
						"bare": true,
						"pattern": "^The[ \\w]+can take (\\d+) legendary actions.*?start of its turn[.]?",
						"matchGroup": 1
					},
					{
						"name": "legendaryActions",
						"type": "orderedContent",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"contentModel": [
							{
								"name": "name",
								"type": "string",
								"bare": true,
								"pattern": "(^|.*?[a-z]\\.\\s?)((?:[A-Z][\\w\\-']+[,:!]?|A)(?:\\s(?:[A-Z][\\w\\-']+[,:!]?|of|with|to|the|and|or|a)+)*)(\\s?\\([^\\)]+\\))?\\.(?!$)",
								"matchGroup": 2,
								"forPreviousMatchGroup": 1,
								"forNextMatchGroup": 3,
								"caseSensitive": true
							},
							{
								"name": "cost",
								"type": "number",
								"bare": true,
								"pattern": "^\\s*\\(\\s*costs (\\d+) actions\\s*\\)",
								"matchGroup": 1,
								"minOccurs": 0
							},
							{
								"name": "text",
								"bare": true,
								"type": "string"
							}
						]
					}
				]
			},
			{
				"name": "lairActionSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Lair Actions$"
					},
					{
						"name": "lairActions",
						"type": "string",
						"bare": true,
						"minOccurs": 1,
						"maxOccurs": "Infinity"
					}
				]
			},
			{
				"name": "regionalEffectsSection",
				"type": "orderedContent",
				"minOccurs": 0,
				"maxOccurs": 1,
				"flatten": true,
				"contentModel": [
					{
						"name": "actionHeader",
						"type": "heading",
						"bare": true,
						"pattern": "^Regional Effects$"
					},
					{
						"name": "regionalEffects",
						"type": "string",
						"minOccurs": 1,
						"maxOccurs": "Infinity",
						"bare": true
					},
					{
						"name": "regionalEffectsFade",
						"type": "string",
						"bare": true
					}
				]
			}
		]
	};

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);
	var roll20 = __webpack_require__(1);

	/**
	 *
	 * @param config
	 * @returns {{debug:function, error:function, info:function, trace:function, warn:function}}
	 */
	module.exports = function (config) {
	    'use strict';

	    var logger = {
	            OFF: 0,
	            ERROR: 1,
	            WARN: 2,
	            INFO: 3,
	            DEBUG: 4,
	            TRACE: 5,
	            prefixString: ''
	        },

	        stringify = function (object) {
	            if (object === undefined) {
	                return object;
	            }

	            return typeof object === 'string' ? object : JSON.stringify(object, function (key, value) {
	                if (key !== 'logWrap' && key !== 'isLogWrapped') {
	                    return value;
	                }
	            });
	        },

	        shouldLog = function (level) {
	            var logLevel = logger.INFO;
	            if (config && config.logLevel) {
	                logLevel = logger[config.logLevel];
	            }

	            return level <= logLevel;
	        },

	        outputLog = function (level, message) {

	            if (!shouldLog(level)) {
	                return;
	            }

	            var args = arguments.length > 2 ? _.toArray(arguments).slice(2) : [];
	            message = stringify(message);
	            if (message) {
	                message = message.replace(/\$\$\$/g, function () {
	                    return stringify(args.shift());
	                });
	            }
	            //noinspection NodeModulesDependencies
	            roll20.log('ShapedScripts ' + Date.now() + ' ' + logger.getLabel(level) + ' : ' +
	                (shouldLog(logger.TRACE) ? logger.prefixString : '') +
	                message);
	        };

	    logger.getLabel = function (logLevel) {
	        var logPair = _.chain(this).pairs().find(function (pair) {
	            return pair[1] === logLevel;
	        }).value();
	        return logPair ? logPair[0] : 'UNKNOWN';
	    };

	    _.each(logger, function (level, levelName) {
	        logger[levelName.toLowerCase()] = _.partial(outputLog.bind(logger), level);
	    });

	    logger.wrapModule = function (modToWrap) {
	        if (shouldLog(logger.TRACE)) {
	            _.chain(modToWrap)
	                .functions()
	                .each(function (funcName) {
	                    var origFunc = modToWrap[funcName];
	                    modToWrap[funcName] = logger.wrapFunction(funcName, origFunc, modToWrap.logWrap);
	                });
	            modToWrap.isLogWrapped = true;
	        }
	    };

	    logger.wrapFunction = function (name, func, moduleName) {
	        if (shouldLog(logger.TRACE)) {
	            if (name === 'toJSON' || moduleName === 'roll20' && name === 'log') {
	                return func;
	            }
	            return function () {
	                logger.trace('$$$.$$$ starting with this value: $$$ and args $$$', moduleName, name, this, arguments);
	                logger.prefixString = logger.prefixString + '  ';
	                var retVal = func.apply(this, arguments);
	                logger.prefixString = logger.prefixString.slice(0, -2);
	                logger.trace('$$$.$$$ ending with return value $$$', moduleName, name, retVal);
	                if (retVal && retVal.logWrap && !retVal.isLogWrapped) {
	                    logger.wrapModule(retVal);
	                }
	                return retVal;
	            };
	        }
	        return func;
	    };
	    //noinspection JSValidateTypes
	    return logger;
	};


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var _ = __webpack_require__(3);
	var utils = __webpack_require__(7);

		var currentVersion = '0.2';

		var entities = {};

		var noWhiteSpaceEntities = {};


		var entityProcessors = {};

	module.exports = {

		configureEntity: function (entityName, processors) {
			entities[entityName] = {};
			noWhiteSpaceEntities[entityName] = {};
			entityProcessors[entityName] = processors;
		},

		addEntities: function (entitiesObject) {
			var results = {
				errors: []
			};
			//TODO: Do semver properly
			if (utils.versionCompare(currentVersion, entitiesObject.version) !== 0) {
				results.errors.push({
					entity: 'general',
					errors: ['Invalid JSON version [' + entitiesObject.version + ']. Script supports version: [' + currentVersion + ']']
				});
				return results;
	        }

			_.chain(entitiesObject)
			.omit('version', 'patch')
			.each(function (entityArray, type) {
				results[type] = {
					withErrors: [],
					skipped: [],
					deleted: [],
					patched: [],
					added: []
				};

				if (!entities[type]) {
					results.errors.push({entity: 'general', errors: ['Unrecognised entity type ' + type]});
					return;
				}


				_.each(entityArray, function (entity) {
					var key = entity.name.toLowerCase();
					var operation = !!entities[type][key] ? (entitiesObject.patch ? 'patched' : 'skipped') : 'added';

					//noinspection FallThroughInSwitchStatementJS
					if (operation === 'patched') {
						entity = patchEntity(entities[type][key], entity);
						if (!entity) {
							operation = 'deleted';
							delete entities[type][key];
							delete noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
						}

					}

					if (_.contains(['patched', 'added'], operation)) {
						var processed = _.reduce(entityProcessors[type], utils.executor, {entity: entity, errors: []});
						if (!_.isEmpty(processed.errors)) {
							processed.entity = processed.entity.name;
							results.errors.push(processed);
							operation = 'withErrors';
						}
						else {
							if (processed.entity.name.toLowerCase() !== key) {
								results[type].deleted.push(key);
								delete entities[type][key];
								delete noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
								key = processed.entity.name.toLowerCase();
							}
							entities[type][key] = processed.entity;
							noWhiteSpaceEntities[type][key.replace(/\s+/g, '')] = processed.entity;
						}
					}


					results[type][operation].push(key);
				});
			});

			return results;
	    },
	    findEntity: function (type, name, tryWithoutWhitespace) {
	        var key = name.toLowerCase();
	        if (!entities[type]) {
				throw new Error('Unrecognised entity type ' + type);
	        }
	        var found = entities[type][key];
	        if (!found && tryWithoutWhitespace) {
	            found = noWhiteSpaceEntities[type][key.replace(/\s+/g, '')];
	        }
	        return found && utils.deepClone(found);
	    },
	    getAll: function (type) {
	        return utils.deepClone(_.values(entities[type]));
	    },

		spellHydrator: function (monsterInfo) {
			var monster = monsterInfo.entity;
			var self = this;
			if (monster.spells) {
				monster.spells = _.map(monster.spells.split(', '), function (spellName) {
					return self.findEntity('spells', spellName) || spellName;
				});
			}
			return monsterInfo;
		},

		monsterSpellUpdater: function (spellInfo) {
			var spell = spellInfo.entity;
			_.chain(entities.monsters)
			.pluck('spells')
			.compact()
			.each(function (spellArray) {
				var spellIndex = _.findIndex(spellArray, function (monsterSpell) {
					if (typeof monsterSpell === 'string') {
						return monsterSpell.toLowerCase() === spell.name.toLowerCase();
					}
					else {
						return monsterSpell !== spell && monsterSpell.name.toLowerCase() === spell.name.toLowerCase();
					}
				});
				if (spellIndex !== -1) {
					spellArray[spellIndex] = spell;
				}
			});
			return spellInfo;
		},

		wrapJsonValidator: function (jsonValidator) {
			return function (entityInfo) {
				var result = jsonValidator(entityInfo.entity);
				entityInfo.errors = entityInfo.errors.concat(result.errors);
				return entityInfo;
			};
		},

	    logWrap: 'entityLookup',
	    toJSON: function () {
	        return {monsterCount: _.size(entities.monster), spellCount: _.size(entities.spell)};
	    }
	};

		function patchEntity(original, patch) {
			if (patch.remove) {
				return undefined;
			}
			return _.mapObject(original, function (propVal, propName) {
				if (propName === 'name' && patch.newName) {
					return patch.newName;
				}
				return patch[propName] || propVal;

			});
		}


		/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

		'use strict';
	var _ = __webpack_require__(3);

	module.exports = {
	    deepExtend: function (original, newValues) {
	        var self = this;
	        if (!original) {
	            original = _.isArray(newValues) ? [] : {};
	        }
	        _.each(newValues, function (value, key) {
	            if (_.isArray(original[key])) {
	                if (!_.isArray(value)) {
	                    original[key].push(value);
	                }
	                else {
	                    original[key] = _.map(value, function (item, index) {
	                        if (_.isObject(item)) {
	                            return self.deepExtend(original[key][index], item);
	                        }
	                        else {
	                            return item !== undefined ? item : original[key][index];
	                        }
	                    });
	                }
	            }
	            else if (_.isObject(original[key])) {
	                original[key] = self.deepExtend(original[key], value);
	            }
	            else {
	                original[key] = value;
	            }

	        });
	        return original;
	    },

	    createObjectFromPath: function (pathString, value) {
	        var newObject = {};
	        _.reduce(pathString.split(/\./), function (object, pathPart, index, pathParts) {
	            var match = pathPart.match(/([^.\[]*)(?:\[(\d+)\])?/);
	            var newVal = index === pathParts.length - 1 ? value : {};

	            if (match[2]) {
	                object[match[1]] = [];
	                object[match[1]][match[2]] = newVal;
	            }
	            else {
	                object[match[1]] = newVal;
	            }
	            return newVal;

	        }, newObject);
	        return newObject;
	    },

	    deepClone: function (object) {
	        return JSON.parse(JSON.stringify(object));
		},

		executor: function () {
			switch (arguments.length) {
				case 0:
					return;
				case 1:
					return arguments[0]();
				default:
					var args = Array.apply(null, arguments).slice(2);
					args.unshift(arguments[0]);
					return arguments[1].apply(null, args);
			}
		},

		versionCompare: function (v1, v2) {

			if (v1 === v2) {
				return 0;
			}
			else if (v1 === undefined || v1 === null) {
				return -1;
			}
			else if (v2 === undefined || v2 === null) {
				return 1;
			}

			var v1parts = v1.split('.');
			var v2parts = v2.split('.');

			var isValidPart = function (x) {
				return /^\d+$/.test(x);
			};

			if (!v1parts.every(isValidPart) || !v2parts.every(isValidPart)) {
				return NaN;
			}

			v1parts = _.map(v1parts, Number);
			v2parts = _.map(v2parts, Number);

			for (var i = 0; i < v1parts.length; ++i) {
				if (v2parts.length === i) {
					return 1;
				}

				if (v1parts[i] > v2parts[i]) {
					return 1;
				} else if (v1parts[i] < v2parts[i]) {
					return -1;
				}
			}

			if (v1parts.length !== v2parts.length) {
				return -1;
			}

			return 0;
	    }
	};


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	/* globals unescape */
	'use strict';
	var _ = __webpack_require__(3);
	var srdConverter = __webpack_require__(9);
	var parseModule = __webpack_require__(2);
	var cp = __webpack_require__(10);
	var utils = __webpack_require__(7);
	var mpp = __webpack_require__(11);

	var version        = '0.4.1',
	    schemaVersion  = 0.4,
	    configDefaults = {
	        logLevel: 'INFO',
	        tokenSettings: {
	            number: false,
	            bar1: {
	                attribute: 'HP',
	                max: true,
	                link: false,
	                showPlayers: false
	            },
	            bar2: {
	                attribute: 'speed',
	                max: false,
	                link: true,
	                showPlayers: false
	            },
	            bar3: {
	                attribute: '',
	                max: false,
	                link: false,
	                showPlayers: false
	            },
	            showName: true,
	            showNameToPlayers: false
	        },
	        newCharSettings: {
	            sheetOutput: '@{output_to_all}',
	            deathSaveOutput: '@{output_to_all}',
	            initiativeOutput: '@{output_to_all}',
	            showNameOnRollTemplate: '@{show_character_name_yes}',
	            rollOptions: '@{normal}',
	            initiativeRoll: '@{normal_initiative}',
	            initiativeToTracker: '@{initiative_to_tracker_yes}',
	            breakInitiativeTies: '@{initiative_tie_breaker_var}',
	            showTargetAC: '@{attacks_vs_target_ac_no}',
	            showTargetName: '@{attacks_vs_target_name_no}',
	            autoAmmo: '@{ammo_auto_use_var}'
	        },
	        rollHPOnDrop: true,
	        genderPronouns: [
	            {
	                matchPattern: '^f$|female|girl|woman|feminine',
	                nominative: 'she',
	                accusative: 'her',
	                possessive: 'her',
	                reflexive: 'herself'
	            },
	            {
	                matchPattern: '^m$|male|boy|man|masculine',
	                nominative: 'he',
	                accusative: 'him',
	                possessive: 'his',
	                reflexive: 'himself'
	            },
	            {
	                matchPattern: '^n$|neuter|none|construct|thing|object',
	                nominative: 'it',
	                accusative: 'it',
	                possessive: 'its',
	                reflexive: 'itself'
	            }
	        ],
	        defaultGenderIndex: 2

	    };

	var configToAttributeLookup = {
	    sheetOutput: 'output_option',
	    deathSaveOutput: 'death_save_output_option',
	    initiativeOutput: 'initiative_output_option',
	    showNameOnRollTemplate: 'show_character_name',
	    rollOptions: 'roll_setting',
	    initiativeRoll: 'initiative_roll',
	    initiativeToTracker: 'initiative_to_tracker',
	    breakInitiativeTies: 'initiative_tie_breaker',
	    showTargetAC: 'attacks_vs_target_ac',
	    showTargetName: 'attacks_vs_target_name',
	    autoAmmo: 'ammo_auto_use'
	};

	var booleanValidator     = function (value) {
	        var converted = value === 'true' || (value === 'false' ? false : value);
	        return {
	            valid: typeof value === 'boolean' || value === 'true' || value === 'false',
	            converted: converted
	        };
	    },

	    stringValidator      = function (value) {
	        return {
	            valid: true,
	            converted: value
	        };
	    },

	    getOptionList        = function (options) {
	        return function (value) {
	            if (value === undefined) {
	                return options;
	            }
	            return {
	                converted: options[value],
	                valid: options[value] !== undefined
	            };
	        };
	    },

	    integerValidator     = function (value) {
	        var parsed = parseInt(value);
	        return {
	            converted: parsed,
	            valid: !isNaN(parsed)
	        };
	    },

	    sheetOutputValidator = getOptionList({
	        public: '@{output_to_all}',
	        whisper: '@{output_to_gm}'
	    }),
	    barValidator         = {
	        attribute: stringValidator,
	        max: booleanValidator,
	        link: booleanValidator,
	        showPlayers: booleanValidator
	    },
	    regExpValidator      = function (value) {
	        try {
	            new RegExp(value, 'i').test('');
	            return {
	                converted: value,
	                valid: true
	            };
	        }
	        catch (e) {
	        }
	        return {
	            converted: null,
	            valid: false
	        };
	    };

	/**
	 * @typedef {Object} ChatMessage
	 * @property {string} content
	 * @property {string} type
	 * @property {SelectedItem[]} selected
	 * @property {string} rolltemplate
	 */


	/**
	 *
	 * @typedef {Object} SelectedItem
	 * @property {string} _id
	 * @property (string _type
	 */

	/**
	 *
	 * @param logger
	 * @param myState
	 * @param roll20
	 * @param parser
	 * @param entityLookup
	 * @returns {{handleInput: function, configOptionsSpec: {}, configure: function, applyTokenDefaults: function, importStatblock: function, importMonstersFromJson: function, importMonsters: function, importSpellsFromJson: function, addSpellsToCharacter:function, hydrateSpellList: function, monsterDataPopulator: function, getTokenRetrievalStrategy: function, nameRetrievalStrategy: function, creationRetrievalStrategy: function, getTokenConfigurer: function, getImportDataWrapper: function, handleAddToken: function, handleChangeToken: function, getHPBar: function, rollHPForToken: function, checkForAmmoUpdate: function, checkForDeathSave: function, getRollTemplateOptions: function, processInlinerolls: function, checkInstall: function, registerEventHandlers: function, logWrap: string}}
	 */
	module.exports = function (logger, myState, roll20, parser, entityLookup) {
	    var sanitise = logger.wrapFunction('sanitise', __webpack_require__(12), '');
	    var addedTokenIds = [];
	    var report = function (heading, text) {
	        //Horrible bug with this at the moment - seems to generate spurious chat
	        //messages when noarchive:true is set
	        //sendChat('ShapedScripts', '' + msg, null, {noarchive:true});

	        roll20.sendChat('',
	          '/w gm <div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
	          '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;">' +
	          'Shaped Scripts ' + heading +
	          '</div>' +
	          text +
	          '</div>');
	    };

	    var reportError = function (text) {
	        roll20.sendChat('',
	          '/w gm <div style="border: 1px solid black; background-color: white; padding: 3px 3px;">' +
	          '<div style="font-weight: bold; border-bottom: 1px solid black;font-size: 130%;color:red;">' +
	          'Shaped Scripts Error' +
	          '</div>' +
	          text +
	          '</div>');
	    };

	    var shapedModule = {

	        /**
	         *
	         * @param {ChatMessage} msg
	         */
	        handleInput: function (msg) {
	            var commandProcessor = cp('shaped')
	              .addCommand('config', this.configure.bind(this))
	              .options(this.configOptionsSpec)
	              .addCommand('import-statblock', this.importStatblock.bind(this))
	              .option('overwrite', booleanValidator)
	              .option('replace', booleanValidator)
	              .withSelection({
	                  graphic: {
	                      min: 1,
	                      max: Infinity
	                  }
	              })
	              .addCommand('import-monster', this.importMonstersFromJson.bind(this))
	              .option('all', booleanValidator)
				.optionLookup('monsters', entityLookup.findEntity.bind(entityLookup, 'monsters'))
	              .option('overwrite', booleanValidator)
	              .option('replace', booleanValidator)
	              .withSelection({
	                  graphic: {
	                      min: 0,
	                      max: 1
	                  }
	              })
	              .addCommand('import-spell', this.importSpellsFromJson.bind(this))
				.optionLookup('spells', entityLookup.findEntity.bind(entityLookup, 'spells'))
	              .withSelection({
	                  character: {
	                      min: 1,
	                      max: 1
	                  }
	              })
	              .addCommand('token-defaults', this.applyTokenDefaults.bind(this))
	              .withSelection({
	                  graphic: {
	                      min: 1,
	                      max: Infinity
	                  }
	              })
	              .end();

	            try {
	                logger.debug(msg);
	                if (msg.type !== 'api') {
	                    this.checkForAmmoUpdate(msg);
	                    this.checkForDeathSave(msg);
	                    return;
	                }

	                commandProcessor.processCommand(msg);

	            }
	            catch (e) {
	                if (typeof e === 'string' || e instanceof parseModule.ParserError) {
	                    reportError(e);
	                    logger.error('Error: $$$', e.toString());
	                }
	                else {
	                    logger.error(e.toString());
	                    logger.error(e.stack);
	                    reportError('An error occurred. Please see the log for more details.');
	                }
	            }
	            finally {
	                logger.prefixString = '';
	            }
	        },

	        configOptionsSpec: {
	            logLevel: function (value) {
	                var converted = value.toUpperCase();
	                return {valid: _.has(logger, converted), converted: converted};
	            },
	            tokenSettings: {
	                number: booleanValidator,
	                bar1: barValidator,
	                bar2: barValidator,
	                bar3: barValidator,
	                showName: booleanValidator,
	                showNameToPlayers: booleanValidator
	            },
	            newCharSettings: {
	                sheetOutput: sheetOutputValidator,
	                deathSaveOutput: sheetOutputValidator,
	                initiativeOutput: sheetOutputValidator,
	                showNameOnRollTemplate: getOptionList({
	                    true: '@{show_character_name_yes}',
	                    false: '@{show_character_name_no}'
	                }),
	                rollOptions: getOptionList({
	                    normal: '@{roll_1}',
	                    advantage: '@{roll_advantage}',
	                    disadvantage: '@{roll_disadvantage}',
	                    two: '@{roll_2}'
	                }),
	                initiativeRoll: getOptionList({
	                    normal: '@{normal_initiative}',
	                    advantage: '@{advantage_on_initiative}',
	                    disadvantage: '@{disadvantage_on_initiative}'
	                }),
	                initiativeToTracker: getOptionList({
	                    true: '@{initiative_to_tracker_yes}',
	                    false: '@{initiative_to_tracker_no}'
	                }),
	                breakInitiativeTies: getOptionList({
	                    true: '@{initiative_tie_breaker_var}',
	                    false: ''
	                }),
	                showTargetAC: getOptionList({
	                    true: '@{attacks_vs_target_ac_yes}',
	                    false: '@{attacks_vs_target_ac_no}'
	                }),
	                showTargetName: getOptionList({
	                    true: '@{attacks_vs_target_name_yes}',
	                    false: '@{attacks_vs_target_name_no}'
	                }),
	                autoAmmo: getOptionList({
	                    true: '@{ammo_auto_use_var}',
	                    false: ''
	                })
	            },
	            rollHPOnDrop: booleanValidator,
	            genderPronouns: [
	                {
	                    matchPattern: regExpValidator,
	                    nominative: stringValidator,
	                    accusative: stringValidator,
	                    possessive: stringValidator,
	                    reflexive: stringValidator
	                }
	            ],
	            defaultGenderIndex: integerValidator
	        },

	        /////////////////////////////////////////
	        // Configuration UI
	        /////////////////////////////////////////
	        configUI: {
	            getConfigOptions: function (options, optionsSpec) {
	                return this.getConfigOptionGroupGeneral(options, optionsSpec) +
	                  this.getConfigOptionGroupTokens(options, optionsSpec) +
	                  this.getConfigOptionGroupNewCharSettings(options, optionsSpec);
	            },

	            getConfigOptionGroupGeneral: function (options, optionsSpec) {
	                return '<div><h3>General Options:</h3><dl style="margin-top: 0;">' +
	                  this.generalOptions.logLevel(options, optionsSpec) +
	                  '</dl></div>';
	            },

	            getConfigOptionGroupTokens: function (options, optionsSpec) {
	                return '<div><h3>Token Options:</h3><dl style="margin-top: 0;">' +
	                  this.tokenOptions.numbered(options, optionsSpec) +
	                  this.tokenOptions.showName(options, optionsSpec) +
	                  this.tokenOptions.showNameToPlayers(options, optionsSpec) +
	                  this.tokenOptions.bars(options, optionsSpec) +
	                  '</dl></div>';
	            },

	            getConfigOptionGroupNewCharSettings: function (options, optionsSpec) {
	                return '<div><h3>New Characters:</h3><dl>' +
	                  this.newCharOptions.sheetOutput(options, optionsSpec) +
	                  this.newCharOptions.deathSaveOutput(options, optionsSpec) +
	                  this.newCharOptions.initiativeOutput(options, optionsSpec) +
	                  this.newCharOptions.showNameOnRollTemplate(options, optionsSpec) +
	                  this.newCharOptions.rollOptions(options, optionsSpec) +
	                  this.newCharOptions.initiativeRoll(options, optionsSpec) +
	                  this.newCharOptions.initiativeToTracker(options, optionsSpec) +
	                  this.newCharOptions.breakInitiativeTies(options, optionsSpec) +
	                  this.newCharOptions.showTargetAC(options, optionsSpec) +
	                  this.newCharOptions.showTargetName(options, optionsSpec) +
	                  this.newCharOptions.autoAmmo(options, optionsSpec) +
	                  '</dl></div>';
	            },

	            generalOptions: {
	                logLevel: function (options, optionsSpec) {
	                    return '<dt>Log Level</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --logLevel ?{Logging Level? (use with care)?|INFO|ERROR|WARN|DEBUG|TRACE}">' +
	                      options.logLevel + '</dd>';
	                }
	            },

	            tokenOptions: {
	                numbered: function (options, optionsSpec) {
	                    return '<dt>Numbered Tokens</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --tokenSettings.number ?{Make Numbered Tokens (for TNN script)?|Yes,true|No,false}">' +
	                      options.tokenSettings.number + '</a></dd>';
	                },

	                showName: function (options, optionsSpec) {
	                    return '<dt>Show Name Tag</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --tokenSettings.showName ?{Show Name Tag?|Yes,true|No,false}">' +
	                      options.tokenSettings.showName + '</a></dd>';
	                },

	                showNameToPlayers: function (options, optionsSpec) {
	                    return '<dt>Show Name to Players</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --tokenSettings.showNameToPlayers ?{Show Name Tag To Players?|Yes,true|No,false}">' +
	                      options.tokenSettings.showNameToPlayers + '</a></dd>';
	                },

	                bars: function (options, optionsSpec) {
	                    var settings = options.tokenSettings;
	                    var res = '';

	                    _.chain(settings).pick(['bar1', 'bar2', 'bar3']).each(function (bar, barName) {
	                        var attribute = bar.attribute;
	                        if (!bar.attribute) {
	                            attribute = '[not set]';
	                        }
	                        res += '<dt>Options for ' + barName + '</dt>' +
	                          '<dd style="margin-bottom: 9px"><table style="font-size: 1em;">' +
	                          '<tr><td>Attribute:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.attribute ?{Attribute for bar? (leave empty to clear)}">' + attribute + '</a></td></tr>' +
	                          '<tr><td>Set Max:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.max ?{Set bar max value?|Yes,true|No,false}">' + bar.max + '</td></tr>' +
	                          '<tr><td>Link Bar:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.link ?{Keep bar linked?|Yes,true|No,false}">' + bar.link + '</a></td></tr > ' +
	                          '<tr><td>Show to Players:</td><td><a href="!shaped-config --tokenSettings.' + barName + '.showPlayers ?{Show bar to players?|Yes,true|No,false}">' + bar.showPlayers + '</td></tr>' +
	                          '</table></dd>';
	                    });

	                    return res;
	                }
	            },

	            newCharOptions: {
	                sheetOutput: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.sheetOutput())[options.newCharSettings.sheetOutput];
	                    return '<dt>Sheet Output</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.sheetOutput ?{Sheet Output?|Public,public|Whisper to GM,whisper}">' +
	                      optVal + '</a></dd>';
	                },

	                deathSaveOutput: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.deathSaveOutput())[options.newCharSettings.deathSaveOutput];
	                    return '<dt>Death Save Output</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.deathSaveOutput ?{Death Save Output?|Public,public|Whisper to GM,whisper}">' +
	                      optVal + '</a></dd>';
	                },

	                initiativeOutput: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.initiativeOutput())[options.newCharSettings.initiativeOutput];
	                    return '<dt>Initiative Output</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.initiativeOutput ?{Initiative Output?|Public,public|Whisper to GM,whisper}">' +
	                      optVal + '</a></dd>';
	                },

	                showNameOnRollTemplate: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.showNameOnRollTemplate())[options.newCharSettings.showNameOnRollTemplate];
	                    return '<dt>Show Name on Roll Template</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.showNameOnRollTemplate ?{Show Name on Roll Template?|Yes,true|No,false}">' +
	                      optVal + '</a></dd>';
	                },

	                rollOptions: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.rollOptions())[options.newCharSettings.rollOptions];
	                    return '<dt>Roll Option</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.rollOptions ?{Roll Option?|Normal,normal|Advantage,advantage|Disadvantage,disadvantage|Roll Two,two}">' +
	                      optVal + '</a></dd>';
	                },

	                initiativeRoll: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.initiativeRoll())[options.newCharSettings.initiativeRoll];
	                    return '<dt>Init Roll</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.initiativeRoll ?{Initiative Roll?|Normal,normal|Advantage,advantage|Disadvantage,disadvantage}">' +
	                      optVal + '</a></dd>';
	                },

	                initiativeToTracker: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.initiativeToTracker())[options.newCharSettings.initiativeToTracker];
	                    return '<dt>Init To Tracker</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.initiativeToTracker ?{Initiative Sent To Tracker?|Yes,true|No,false}">' +
	                      optVal + '</a></dd>';
	                },

	                breakInitiativeTies: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.breakInitiativeTies())[options.newCharSettings.breakInitiativeTies];
	                    return '<dt>Break Init Ties</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.breakInitiativeTies ?{Break Initiative Ties?|Yes,true|No,false}">' +
	                      optVal + '</a></dd>';
	                },

	                showTargetAC: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.showTargetAC())[options.newCharSettings.showTargetAC];
	                    return '<dt>Show Target AC</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.showTargetAC ?{Show Target AC?|Yes,true|No,false}">' +
	                      optVal + '</a></dd>';
	                },

	                showTargetName: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.showTargetName())[options.newCharSettings.showTargetName];
	                    return '<dt>Show Target Name</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.showTargetName ?{Show Target Name?|Yes,true|No,false}">' +
	                      optVal + '</a></dd>';
	                },

	                autoAmmo: function (options, optionsSpec) {
	                    var optVal = _.invert(optionsSpec.newCharSettings.autoAmmo())[options.newCharSettings.autoAmmo];
	                    return '<dt>Auto Use Ammo</dt><dd style="margin-bottom: 9px">' +
	                      '<a href="!shaped-config --newCharSettings.autoAmmo ?{Auto use Ammo?|Yes,true|No,false}">' +
	                      optVal + '</a></dd>';
	                }
	            }
	        },

	        /////////////////////////////////////////
	        // Command handlers
	        /////////////////////////////////////////
	        configure: function (options) {
	            utils.deepExtend(myState.config, options);
	            report('Configuration', this.configUI.getConfigOptions(myState.config, this.configOptionsSpec));
	        },

	        applyTokenDefaults: function (options) {
	            var self = this;
	            _.each(options.selected.graphic, function (token) {
	                var represents = token.get('represents');
	                var character = roll20.getObj('character', represents);
	                if (character) {
	                    self.getTokenConfigurer(token)(character);
	                }
	            });
	        },

	        importStatblock: function (options) {
	            logger.info('Importing statblocks for tokens $$$', options.selected.graphic);
	            var self = this;
	            _.each(options.selected.graphic, function (token) {
	                var text = token.get('gmnotes');
	                if (text) {
	                    text = sanitise(unescape(text), logger);
	                    var processedNpc = mpp(parser.parse(text).npc, entityLookup);
	                    self.importMonsters([processedNpc], options, token, [function (character) {
	                        character.set('gmnotes', text.replace(/\n/g, '<br>'));
	                    }]);
	                }
	            });
	        },

	        importMonstersFromJson: function (options) {
	            if (options.all) {
	                options.monsters = entityLookup.getAll('monster');
	                delete options.all;
	            }


				this.importMonsters(options.monsters.slice(0, 20), options, options.selected.graphic, []);
	            options.monsters = options.monsters.slice(20);
	            var self = this;
	            if (!_.isEmpty(options.monsters)) {
	                setTimeout(function () {
	                    self.importMonstersFromJson(options);
	                }, 200);
	            }

	        },

	        importMonsters: function (monsters, options, token, characterProcessors) {
	            var characterRetrievalStrategies = [];

	            if (token) {
	                characterProcessors.push(this.getAvatarCopier(token).bind(this));
	                if (_.size(monsters) === 1) {
	                    characterProcessors.push(this.getTokenConfigurer(token).bind(this));
	                    if (options.replace || options.overwrite) {
	                        characterRetrievalStrategies.push(this.getTokenRetrievalStrategy(token).bind(this));
	                    }
	                }
	            }
	            if (options.replace) {
	                characterRetrievalStrategies.push(this.nameRetrievalStrategy);
	            }

	            characterRetrievalStrategies.push(this.creationRetrievalStrategy.bind(this));
	            characterProcessors.push(this.monsterDataPopulator.bind(this));

	            var errors = [];
	            var importedList = _.chain(monsters)
	              .map(function (monsterData) {

	                  var character = _.reduce(characterRetrievalStrategies, function (result, strategy) {
	                      return result || strategy(monsterData.name, errors);
	                  }, null);

	                  if (!character) {
	                      logger.error('Failed to find or create character for monster $$$', monsterData.name);
	                      return null;
	                  }

	                  var oldAttrs = roll20.findObjs({type: 'attribute', characterid: character.id});
	                  _.invoke(oldAttrs, 'remove');
	                  character.set('name', monsterData.name);

	                  _.each(characterProcessors, function (proc) {
	                      proc(character, monsterData);
	                  });
	                  return character && character.get('name');
	              })
	              .compact()
	              .value();

	            if (!_.isEmpty(importedList)) {
	                var monsterList = importedList.join('</li><li>');
	                report('Import Success', 'Added the following monsters: <ul><li>' + monsterList + '</li></ul>');
	            }
	            if (!_.isEmpty(errors)) {
	                var errorList = errors.join('</li><li>');
	                reportError('The following errors occurred on import:  <ul><li>' + errorList + '</li></ul>');
	            }
	        },

	        importSpellsFromJson: function (options) {
	            this.addSpellsToCharacter(options.selected.character, options.spells);
	        },

	        addSpellsToCharacter: function (character, spells, noreport) {
	            var gender = roll20.getAttrByName(character.id, 'gender');

	            var defaultIndex = Math.min(myState.config.defaultGenderIndex, myState.config.genderPronouns.length);
	            var defaultPronounInfo = myState.config.genderPronouns[defaultIndex];
	            var pronounInfo = _.clone(_.find(myState.config.genderPronouns, function (pronounDetails) {
	                  return new RegExp(pronounDetails.matchPattern, 'i').test(gender);
	              }) || defaultPronounInfo);

	            _.defaults(pronounInfo, defaultPronounInfo);


	            var importData = {
	                spells: srdConverter.convertSpells(spells, pronounInfo)
	            };
	            this.getImportDataWrapper(character).mergeImportData(importData);
	            if (!noreport) {
	                report('Import Success', 'Added the following spells:  <ul><li>' + _.map(importData.spells, function (spell) {
	                      return spell.name;
	                  }).join('</li><li>') + '</li></ul>');
	            }
	        },


	        monsterDataPopulator: function (character, monsterData) {
	            _.each(myState.config.newCharSettings, function (value, key) {
	                var attribute = roll20.getOrCreateAttr(character.id, configToAttributeLookup[key]);
	                attribute.set('current', _.isBoolean(value) ? (value ? 1 : 0) : value);
	            });

	            var converted = srdConverter.convertMonster(monsterData);
	            logger.debug('Converted monster data: $$$', converted);
	            var expandedSpells = converted.spells;
	            delete converted.spells;
	            this.getImportDataWrapper(character).setNewImportData({npc: converted});
	            if (expandedSpells) {
	                this.addSpellsToCharacter(character, expandedSpells, true);
	            }
	            return character;

	        },

	        getTokenRetrievalStrategy: function (token) {
	            return function (name, errors) {
	                return token && roll20.getObj('character', token.get('represents'));
	            };
	        },

	        nameRetrievalStrategy: function (name, errors) {
	            var chars = roll20.findObjs({type: 'character', name: name});
	            if (chars.length > 1) {
	                errors.push('More than one existing character found with name "' + name + '". Can\'t replace');
	            }
	            else {
	                return chars[0];
	            }
	        },

	        creationRetrievalStrategy: function (name, errors) {
	            if (!_.isEmpty(roll20.findObjs({type: 'character', name: name}))) {
	                errors.push('Can\'t create new character with name "' + name + '" because one already exists with that name. Perhaps you want --replace?');
	            }
	            else {
	                return roll20.createObj('character', {name: name});
	            }
	        },

	        getAvatarCopier: function (token) {
	            return function (character) {
	                character.set('avatar', token.get('imgsrc'));
	            };
	        },

	        getTokenConfigurer: function (token) {
	            return function (character) {
	                token.set('represents', character.id);
	                token.set('name', character.get('name'));
	                var settings = myState.config.tokenSettings;
	                if (settings.number && token.get('name').indexOf('%%NUMBERED%%') === -1) {
	                    token.set('name', token.get('name') + ' %%NUMBERED%%');
	                }

	                _.chain(settings)
	                  .pick(['bar1', 'bar2', 'bar3'])
	                  .each(function (bar, barName) {
	                      var attribute = roll20.getOrCreateAttr(character.id, bar.attribute);
	                      if (attribute) {
	                          token.set(barName + '_value', attribute.get('current'));
	                          if (bar.max) {
	                              token.set(barName + '_max', attribute.get('max'));
	                          }
	                          token.set('showplayers_' + barName, bar.showPlayers);
	                          if (bar.link) {
	                              token.set(barName + '_link', attribute.id);
	                          }
	                      }
	                  });

	                token.set('showname', settings.showName);
	                token.set('showplayers_name', settings.showNameToPlayers);
	            };
	        },

	        getImportDataWrapper: function (character) {


	            return {
	                setNewImportData: function (importData) {
	                    if (_.isEmpty(importData)) {
	                        return;
	                    }
	                    roll20.setAttrByName(character.id, 'import_data', JSON.stringify(importData));
	                    roll20.setAttrByName(character.id, 'import_data_present', 'on');
	                },
	                mergeImportData: function (importData) {
	                    if (_.isEmpty(importData)) {
	                        return;
	                    }
	                    var attr = roll20.getOrCreateAttr(character.id, 'import_data');
	                    var dataPresentAttr = roll20.getOrCreateAttr(character.id, 'import_data_present');
	                    var current = {};
	                    try {
	                        if (!_.isEmpty(attr.get('current').trim())) {
	                            current = JSON.parse(attr.get('current'));
	                        }
	                    }
	                    catch (e) {
	                        logger.warn('Existing import_data attribute value was not valid JSON: [$$$]', attr.get('current'));
	                    }
	                    _.each(importData, function (value, key) {
	                        var currentVal = current[key];
	                        if (currentVal) {
	                            if (!_.isArray(currentVal)) {
	                                current[key] = [currentVal];
	                            }
	                            current[key] = current[key].concat(value);
	                        }
	                        else {
	                            current[key] = value;
	                        }

	                    });
	                    logger.debug('Setting import data to $$$', current);
	                    attr.set('current', JSON.stringify(current));
	                    dataPresentAttr.set('current', 'on');
	                    return current;
	                },

	                logWrap: 'importDataWrapper'
	            };
	        },

	        /////////////////////////////////////////////////
	        // Event Handlers
	        /////////////////////////////////////////////////
	        handleAddToken: function (token) {
	            var represents = token.get('represents');
	            if (_.isEmpty(represents)) {
	                return;
	            }
	            var character = roll20.getObj('character', represents);
	            if (!character) {
	                return;
	            }
	            addedTokenIds.push(token.id);

	            //URGH. Thanks Roll20.
	            setTimeout((function (id, self) {
	                return function () {
	                    var token = roll20.getObj('graphic', id);
	                    if (token) {
	                        self.handleChangeToken(token);
	                    }
	                };
	            }(token.id, this)), 100);
	        },

	        handleChangeToken: function (token) {
	            if (_.contains(addedTokenIds, token.id)) {
	                addedTokenIds = _.without(addedTokenIds, token.id);
	                this.rollHPForToken(token);
	            }
	        },

	        getHPBar: function () {
	            return _.chain(myState.config.tokenSettings)
	              .pick('bar1', 'bar2', 'bar3')
	              .findKey({attribute: 'HP'})
	              .value();
	        },

	        rollHPForToken: function (token) {
	            var hpBar = this.getHPBar();
	            logger.debug('HP bar is $$$', hpBar);
	            if (!hpBar || !myState.config.rollHPOnDrop) {
	                return;
	            }

	            var represents = token.get('represents');
	            if (!represents) {
	                return;
	            }
	            var character = roll20.getObj('character', represents);
	            if (!character) {
	                return;
	            }
	            var hpBarLink = token.get(hpBar + '_link');
	            if (hpBarLink) {
	                return;
	            }
	            var formula = roll20.getAttrByName(represents, 'hp_formula');
	            if (!formula) {
	                return;
	            }

	            var self = this;
	            roll20.sendChat('', '%{' + character.get('name') + '|npc_hp}', function (results) {
	                if (results && results.length === 1) {
	                    var message = self.processInlinerolls(results[0]);
	                    var total = results[0].inlinerolls[0].results.total;
	                    roll20.sendChat('HP Roller', '/w GM &{template:5e-shaped} ' + message);
	                    token.set(hpBar + '_value', total);
	                    token.set(hpBar + '_max', total);
	                }
	            });
	        },

	        /**
	         *
	         * @param {ChatMessage} msg
	         */
	        checkForAmmoUpdate: function (msg) {

	            var options = this.getRollTemplateOptions(msg);
	            if (options.ammoName && options.characterName) {
	                var character = roll20.findObjs({
	                    _type: 'character',
	                    name: options.characterName
	                })[0];

	                if (!roll20.getAttrByName(character.id, 'ammo_auto_use')) {
	                    return;
	                }

	                var ammoAttr = _.chain(roll20.findObjs({type: 'attribute', characterid: character.id}))
	                  .filter(function (attribute) {
	                      return attribute.get('name').indexOf('repeating_ammo') === 0;
	                  })
	                  .groupBy(function (attribute) {
	                      return attribute.get('name').replace(/(repeating_ammo_[^_]+).*/, '$1');
	                  })
	                  .find(function (attributes) {
	                      return _.find(attributes, function (attribute) {
	                          return attribute.get('name').match(/.*name$/) && attribute.get('current') === options.ammoName;
	                      });
	                  })
	                  .find(function (attribute) {
	                      return attribute.get('name').match(/.*qty$/);
	                  })
	                  .value();


	                var ammoUsed = 1;
	                if (options.ammo) {
	                    var rollRef = options.ammo.match(/\$\[\[(\d+)\]\]/);
	                    if (rollRef) {
	                        var rollExpr = msg.inlinerolls[rollRef[1]].expression;
	                        var match = rollExpr.match(/\d+-(\d+)/);
	                        if (match) {
	                            ammoUsed = match[1];
	                        }
	                    }

	                }

	                var val = parseInt(ammoAttr.get('current'), 10) || 0;
	                ammoAttr.set('current', Math.max(0, val - ammoUsed));
	            }

	        },

	        checkForDeathSave: function (msg) {
	            var options = this.getRollTemplateOptions(msg);
	            if (options.deathSavingThrow && options.characterName && options.roll1) {
	                var character = roll20.findObjs({
	                    _type: 'character',
	                    name: options.characterName
	                })[0];

	                //TODO: Do we want to output text on death/recovery?
	                var increment = function (val) {
	                    return ++val;
	                };
	                if (roll20.getAttrByName(character.id, 'roll_setting') !== '@{roll_2}') {
	                    var rollIndex = options.roll1.match(/\$\[\[(\d+)\]\]/)[1];
	                    var result = msg.inlinerolls[rollIndex].results.total;
	                    var attributeToIncrement = result >= 10 ? 'death_saving_throw_successes' : 'death_saving_throw_failures';
	                    roll20.processAttrValue(character.id, attributeToIncrement, increment);
	                }
	            }
	        },

	        /**
	         *
	         * @returns {*}
	         */
	        getRollTemplateOptions: function (msg) {
	            if (msg.rolltemplate === '5e-shaped') {
	                var regex = /\{\{(.*?)\}\}/g;
	                var match;
	                var options = {};
	                while (!!(match = regex.exec(msg.content))) {
	                    if (match[1]) {
	                        var splitAttr = match[1].split('=');
	                        var propertyName = splitAttr[0].replace(/_([a-z])/g, function (match, letter) {
	                            return letter.toUpperCase();
	                        });
	                        options[propertyName] = splitAttr.length === 2 ? splitAttr[1] : '';
	                    }
	                }
	                return options;
	            }
	            return {};
	        },

	        processInlinerolls: function (msg) {
	            if (_.has(msg, 'inlinerolls')) {
	                return _.chain(msg.inlinerolls)
	                  .reduce(function (previous, current, index) {
	                      previous['$[[' + index + ']]'] = current.results.total || 0;
	                      return previous;
	                  }, {})
	                  .reduce(function (previous, current, index) {
	                      return previous.replace(index.toString(), current);
	                  }, msg.content)
	                  .value();
	            } else {
	                return msg.content;
	            }
	        },


	        checkInstall: function () {
	            logger.info('-=> ShapedScripts v$$$ <=-', version);
	            if (myState.version !== schemaVersion) {
	                logger.info('  > Updating Schema to v$$$ from $$$<', schemaVersion, myState && myState.version);
	                logger.info('Preupgrade state: $$$', myState);
	                switch (myState && myState.version) {
	                    case 0.1:
	                    case 0.2:
	                    case 0.3:
	                        _.extend(myState.config.genderPronouns, utils.deepClone(configDefaults.genderPronouns));
	                        _.defaults(myState.config, utils.deepClone(configDefaults));
	                        myState.version = schemaVersion;
	                        break;
	                    default:
	                        if (!myState.version) {
	                            _.defaults(myState, {
	                                version: schemaVersion,
	                                config: utils.deepClone(configDefaults)
	                            });
	                            logger.info('Making new state object $$$', myState);
	                        }
	                        else {
	                            logger.error('Unknown schema version for state $$$', myState);
	                            reportError('Serious error attempting to upgrade your global state, please see log for details. ' +
	                              'ShapedScripts will not function correctly until this is fixed');
	                            myState = undefined;
	                        }
	                        break;
	                }
	                logger.info('Upgraded state: $$$', myState);
	            }
	        },

	        registerEventHandlers: function () {
	            roll20.on('chat:message', this.handleInput.bind(this));
	            roll20.on('add:token', this.handleAddToken.bind(this));
	            roll20.on('change:token', this.handleChangeToken.bind(this));
	        },

	        logWrap: 'shapedModule'
	    };

	    logger.wrapModule(shapedModule);
	    return shapedModule;
	};






/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);

	/* jshint camelcase : false */
	function getRenameMapper(newName) {
	    'use strict';
	    return function (key, value, output) {
	        output[newName] = value;
	    };
	}

	var identityMapper     = function (key, value, output) {
	        'use strict';
	        output[key] = value;
	    },
	    booleanMapper      = function (key, value, output) {
	        'use strict';
	        if (value) {
	            output[key] = 'Yes';
	        }
	    },
	    camelCaseFixMapper = function (key, value, output) {
	        'use strict';
	        var newKey = key.replace(/[A-Z]/g, function (letter) {
	            return '_' + letter.toLowerCase();
	        });
	        output[newKey] = value;
	    },
	    castingStatMapper  = function (key, value, output) {
	        'use strict';
	        if (value) {
	            output.add_casting_modifier = 'Yes';
	        }
	    },
	    componentMapper    = function (key, value, output) {
	        'use strict';
	        output.components = _.chain(value)
	          .map(function (value, key) {
	              if (key !== 'materialMaterial') {
	                  return key.toUpperCase().slice(0, 1);
	              }
	              else {
	                  output.materials = value;
	              }

	          })
	          .compact()
	          .value()
	          .join(' ');
	    },
	    saveAttackMappings = {
	        ability: getRenameMapper('saving_throw_vs_ability'),
	        type: identityMapper,
	        damage: identityMapper,
	        damageBonus: camelCaseFixMapper,
	        damageType: camelCaseFixMapper,
	        saveSuccess: getRenameMapper('saving_throw_success'),
	        saveFailure: getRenameMapper('saving_throw_failure'),
	        higherLevelDice: camelCaseFixMapper,
	        higherLevelDie: camelCaseFixMapper,
	        secondaryDamage: getRenameMapper('second_damage'),
	        secondaryDamageBonus: getRenameMapper('second_damage_bonus'),
	        secondaryDamageType: getRenameMapper('second_damage_type'),
	        higherLevelSecondaryDice: getRenameMapper('second_higher_level_dice'),
	        higherLevelSecondaryDie: getRenameMapper('second_higher_level_die'),
	        condition: getRenameMapper('saving_throw_condition'),
	        castingStat: castingStatMapper
	    }
	  ;

	function getObjectMapper(mappings) {
	    'use strict';
	    return function (key, value, output) {
	        _.each(value, function (propVal, propName) {
	            var mapper = mappings[propName];
	            if (!mapper) {
	                throw 'Unrecognised property when attempting to convert to srd format: [' + propName + '] ' + JSON.stringify(output);
	            }
	            mapper(propName, propVal, output);
	        });
	    };
	}

	var spellMapper = getObjectMapper({
	    name: identityMapper,
	    duration: identityMapper,
	    level: getRenameMapper('spell_level'),
	    school: identityMapper,
	    emote: identityMapper,
	    range: identityMapper,
	    castingTime: camelCaseFixMapper,
	    target: identityMapper,
	    description: function (key, value, output) {
	        'use strict';
	        output.content = value + (output.content ? '\n' + output.content : '');
	    },
	    higherLevel: function (key, value, output) {
	        'use strict';
	        output.content = (output.content ? output.content + '\n' : '') + value;
	    },
	    ritual: booleanMapper,
	    concentration: booleanMapper,
	    save: getObjectMapper(saveAttackMappings),
	    attack: getObjectMapper(saveAttackMappings),
	    damage: getObjectMapper(saveAttackMappings),
	    heal: getObjectMapper({
	        amount: getRenameMapper('heal'),
	        castingStat: castingStatMapper,
	        higherLevelDice: camelCaseFixMapper,
	        higherLevelDie: camelCaseFixMapper,
	        higherLevelAmount: getRenameMapper('higher_level_heal'),
	        bonus: getRenameMapper('heal_bonus')
	    }),
	    components: componentMapper,
	    classes: _.noop,
	    aoe: _.noop,
	    source: _.noop,
	    effects: _.noop,
	    domains: _.noop,
	    oaths: _.noop,
	    circles: _.noop,
	    patrons: _.noop
	});


	var monsterMapper = getObjectMapper({
	    name: getRenameMapper('character_name'),
	    size: identityMapper,
	    type: identityMapper,
	    alignment: identityMapper,
	    AC: getRenameMapper('ac_srd'),
	    HP: getRenameMapper('hp_srd'),
	    speed: getRenameMapper('npc_speed'),
	    strength: identityMapper,
	    dexterity: identityMapper,
	    constitution: identityMapper,
	    intelligence: identityMapper,
	    wisdom: identityMapper,
	    charisma: identityMapper,
	    skills: getRenameMapper('skills_srd'),
	    spells: function (key, value, output) {
	        'use strict';
	        var splitSpells = _.partition(value, _.isObject);
	        if (!_.isEmpty(splitSpells[1])) {
	            output.spells_srd = splitSpells[1].join(', ');
	        }
	        if (!_.isEmpty(splitSpells[0])) {
	            output.spells = splitSpells[0];
	        }
	    },
	    savingThrows: getRenameMapper('saving_throws_srd'),
	    damageResistances: getRenameMapper('damage_resistances'),
	    damageImmunities: getRenameMapper('damage_immunities'),
	    conditionImmunities: getRenameMapper('condition_immunities'),
	    damageVulnerabilities: getRenameMapper('damage_vulnerabilities'),
	    senses: identityMapper,
	    languages: identityMapper,
	    challenge: identityMapper,
	    traits: identityMapper,
	    actions: identityMapper,
	    reactions: identityMapper,
	    regionalEffects: identityMapper,
	    regionalEffectsFade: identityMapper,
	    legendaryPoints: identityMapper,
	    legendaryActions: identityMapper,
	    lairActions: identityMapper
	});

	var pronounTokens = {
	    '{{GENDER_PRONOUN_HE_SHE}}': 'nominative',
	    '{{GENDER_PRONOUN_HIM_HER}}': 'accusative',
	    '{{GENDER_PRONOUN_HIS_HER}}': 'possessive',
	    '{{GENDER_PRONOUN_HIMSELF_HERSELF}}': 'reflexive'
	};


	module.exports = {

	    convertMonster: function (npcObject) {
	        'use strict';

	        var output = {};
	        monsterMapper(null, npcObject, output);

	        var actionTraitTemplate = _.template('**<%=data.name%><% if(data.recharge) { print(" (" + data.recharge + ")") } %>**: <%=data.text%>', {variable: 'data'});
	        var legendaryTemplate = _.template('**<%=data.name%><% if(data.cost && data.cost > 1){ print(" (Costs " + data.cost + " actions)") }%>**: <%=data.text%>', {variable: 'data'});
	        var lairRegionalTemplate = function (item) {
	            return '**' + item;
	        };

	        var simpleSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>', {variable: 'data'});
	        var legendarySectionTemplate = _.template('<%=data.title%>\nThe <%=data.name%> can take <%=data.legendaryPoints%> legendary actions, ' +
	          'choosing from the options below. It can take only one legendary action at a time and only at the end of another creature\'s turn.' +
	          ' The <%=data.name%> regains spent legendary actions at the start of its turn.\n<% print(data.items.join("\\n")) %>', {variable: 'data'});
	        var regionalSectionTemplate = _.template('<%=data.title%>\n<% print(data.items.join("\\n")); %>\n**<%=data.regionalEffectsFade%>', {variable: 'data'});

	        var srdContentSections = [
	            {prop: 'traits', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
	            {prop: 'actions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
	            {prop: 'reactions', itemTemplate: actionTraitTemplate, sectionTemplate: simpleSectionTemplate},
	            {prop: 'legendaryActions', itemTemplate: legendaryTemplate, sectionTemplate: legendarySectionTemplate},
	            {prop: 'lairActions', itemTemplate: lairRegionalTemplate, sectionTemplate: simpleSectionTemplate},
	            {prop: 'regionalEffects', itemTemplate: lairRegionalTemplate, sectionTemplate: regionalSectionTemplate}
	        ];

	        var makeDataObject = function (propertyName, itemList) {
	            return {
	                title: propertyName.replace(/([A-Z])/g, ' $1').replace(/^[a-z]/, function (letter) {
	                    return letter.toUpperCase();
	                }),
	                name: output.character_name,
	                legendaryPoints: output.legendaryPoints,
	                regionalEffectsFade: output.regionalEffectsFade,
	                items: itemList
	            };
	        };

	        output.is_npc = 1;
	        output.edit_mode = 'off';

	        output.content_srd = _.chain(srdContentSections)
	          .map(function (sectionSpec) {
	              var items = output[sectionSpec.prop];
	              delete output[sectionSpec.prop];
	              return _.map(items, sectionSpec.itemTemplate);
	          })
	          .map(function (sectionItems, sectionIndex) {
	              var sectionSpec = srdContentSections[sectionIndex];
	              if (!_.isEmpty(sectionItems)) {
	                  return sectionSpec.sectionTemplate(makeDataObject(sectionSpec.prop, sectionItems));
	              }

	              return null;
	          })
	          .compact()
	          .value()
	          .join('\n');

	        delete output.legendaryPoints;

	        return output;

	    },


	    convertSpells: function (spellObjects, pronounInfo) {
	        'use strict';


	        return _.map(spellObjects, function (spellObject) {
	            var converted = {};
	            spellMapper(null, spellObject, converted);
	            if (converted.emote) {
	                _.each(pronounTokens, function (pronounType, token) {
	                    var replacement = pronounInfo[pronounType];
	                    converted.emote = converted.emote.replace(token, replacement);
	                });
	            }
	            return converted;
	        });

	    }
	    /* jshint camelcase : true */
	};


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

	var _ = __webpack_require__(3);
	var roll20 = __webpack_require__(1);
	var utils = __webpack_require__(7);


	var getParser = function (optionString, validator) {
	    'use strict';
	    return function (arg, errors, options) {
	        var argParts = arg.split(/\s+/);
	        if (argParts[0].toLowerCase() === optionString.toLowerCase()) {
	            if (argParts.length <= 2) {
	                //Allow for bare switches
	                var value = argParts.length === 2 ? argParts[1] : true;
	                var result = validator(value);
	                if (result.valid) {
	                    options[argParts[0]] = result.converted;
	                }
	                else {
	                    errors.push('Invalid value [' + value + '] for option [' + argParts[0] + ']');
	                }
	            }
	            return true;
	        }
	        return false;
	    };
	};

	var getObjectParser = function (specObject) {
	    'use strict';
	    return function (arg, errors, options) {
	        var argParts = arg.split(/\s+/);
	        var newObject = utils.createObjectFromPath(argParts[0], argParts.slice(1).join(' '));

	        var comparison = {spec: specObject, actual: newObject};
	        while (comparison.spec) {
	            var key = _.keys(comparison.actual)[0];
	            var spec = comparison.spec[key];
	            if (!spec) {
	                return false;
	            }
	            if (_.isFunction(comparison.spec[key])) {
	                var result = comparison.spec[key](comparison.actual[key]);
	                if (result.valid) {
	                    comparison.actual[key] = result.converted;
	                    utils.deepExtend(options, newObject);
	                }
	                else {
	                    errors.push('Invalid value [' + comparison.actual[key] + '] for option [' + argParts[0] + ']');
	                }
	                return true;
	            }
	            else if (_.isArray(comparison.actual[key])) {
	                var newVal = [];
	                newVal[comparison.actual[key].length - 1] = comparison.spec[key][0];
	                comparison.spec = newVal;
	                comparison.actual = comparison.actual[key];
	            }
	            else {
	                comparison.spec = comparison.spec[key];
	                comparison.actual = comparison.actual[key];
	            }
	        }
	    };
	};

	/**
	 * @constructor
	 */
	function Command(root, handler) {
	    'use strict';
	    this.root = root;
	    this.handler = handler;
	    this.parsers = [];
	}


	Command.prototype.option = function (optionString, validator) {
	    'use strict';
	    if (_.isFunction(validator)) {
	        this.parsers.push(getParser(optionString, validator));
	    }
	    else if (_.isObject(validator)) {
	        var dummy = {};
	        dummy[optionString] = validator;
	        this.parsers.push(getObjectParser(dummy));
	    }
	    else {
	        throw new Error('Bad validator [' + validator + '] specified for option ' + optionString);
	    }

	    return this;
	};

	Command.prototype.options = function (optsSpec) {
	    'use strict';
	    var self = this;
	    _.each(optsSpec, function (validator, key) {
	        self.option(key, validator);
	    });
	    return this;
	};

	Command.prototype.optionLookup = function (groupName, lookupFunction) {
	    'use strict';
	    this.parsers.push(function (arg, errors, options) {
	        options[groupName] = options[groupName] || [];
	        var name = arg.toLowerCase();
	        var resolved = lookupFunction(name);
	        if (resolved) {
	            options[groupName].push(resolved);
	            return true;
	        }
	        return false;
	    });
	    return this;
	};

	Command.prototype.handle = function (args, selection) {
	    'use strict';
	    var self = this;
	    var options = _.reduce(args, function (options, arg) {
	        var parser = _.find(self.parsers, function (parser) {
	            return parser(arg, options.errors, options);
	        });
	        if (!parser) {
	            options.errors.push('Unrecognised or poorly formed option ' + arg);
	        }

	        return options;
	    }, {errors: []});
	    if (options.errors.length > 0) {
	        throw options.errors.join('\n');
	    }
	    delete options.errors;
	    options.selected = this.selectionSpec && processSelection(selection || [], this.selectionSpec);
	    this.handler(options);
	};

	Command.prototype.withSelection = function (selectionSpec) {
	    'use strict';
	    this.selectionSpec = selectionSpec;
	    return this;
	};


	Command.prototype.addCommand = function (cmdString, handler) {
	    'use strict';
	    return this.root.addCommand(cmdString, handler);
	};

	Command.prototype.end = function () {
	    'use strict';
	    return this.root;
	};


	function processSelection(selection, constraints) {
	    'use strict';
	    return _.reduce(constraints, function (result, constraintDetails, type) {

	        var objects = _.chain(selection)
	          .where({_type: type === 'character' ? 'graphic' : type})
	          .map(function (selected) {
	              return roll20.getObj(selected._type, selected._id);
	          })
	          .map(function (object) {
	              if (type === 'character' && object) {
	                  var represents = object.get('represents');
	                  if (represents) {
	                      return roll20.getObj('character', represents);
	                  }
	              }
	              return object;
	          })
	          .compact()
	          .value();
	        if (_.size(objects) < constraintDetails.min || _.size(objects) > constraintDetails.max) {
	            throw 'Wrong number of objects of type [' + type + '] selected, should be between ' + constraintDetails.min + ' and ' + constraintDetails.max;
	        }
	        switch (_.size(objects)) {
	            case 0:
	                break;
	            case 1:
	                if (constraintDetails.max === 1) {
	                    result[type] = objects[0];
	                }
	                else {
	                    result[type] = objects;
	                }
	                break;
	            default:
	                result[type] = objects;
	        }
	        return result;
	    }, {});
	}

	module.exports = function (rootCommand) {
	    'use strict';

	    var commands = {};
	    return {
	        addCommand: function (cmdString, handler) {
	            var command = new Command(this, handler);
	            commands[cmdString] = command;
	            return command;
	        },

	        processCommand: function (msg) {
	            var prefix = '!' + rootCommand + '-';
	            if (msg.type === 'api' && msg.content.indexOf(prefix) === 0) {
	                var cmdString = msg.content.slice(prefix.length);
	                var parts = cmdString.split(/\s+--/);
	                var cmdName = parts.shift();
	                var cmd = commands[cmdName];
	                if (!cmd) {
	                    throw 'Unrecognised command ' + prefix + cmdName;
	                }
	                cmd.handle(parts, msg.selected);
	            }
	        }

	    };


	};


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';
	var _ = __webpack_require__(3);

	var levelStrings = ['Cantrips ', '1st level ', '2nd level ', '3rd level '];
	_.each(_.range(4, 10), function (level) {
	    levelStrings[level] = level + 'th level ';
	});

	var spellcastingHandler = {
	    splitRegex: /(Cantrips|(?:1st|2nd|3rd|[4-9]th)\s*level)\.?\s*\(([^\)]+)\)\s*:/i,

	    makeLevelDetailsObject: function (match) {
	        var levelMatch = match[1].match(/\d/);
	        return {
	            level: levelMatch ? parseInt(levelMatch[0]) : 0,
	            slots: match[2]
	        };
	    },

	    setLevelDetailsString: function (levelDetails) {
	        levelDetails.newText = levelStrings[levelDetails.level] + '(' + levelDetails.slots + '): ';
	        levelDetails.newText += levelDetails.spells.join(', ');
	    }

	};

	var innateHandler = {
	    splitRegex: /(At\s?will|\d\s?\/\s?day)(?:\s?each)?\s?:/i,

	    makeLevelDetailsObject: function (match) {
	        var usesMatch = match[1].match(/\d/);
	        return {
	            uses: usesMatch ? parseInt(usesMatch[0]) : 0,
	            slots: match[2]
	        };
	    },

	    setLevelDetailsString: function (levelDetails) {
	        levelDetails.newText = levelDetails.uses === 0 ? 'At will' : levelDetails.uses + '/day';
	        if (levelDetails.spells.length > 1) {
	            levelDetails.newText += ' each';
	        }
	        levelDetails.newText += ': ';
	        levelDetails.newText += levelDetails.spells.join(', ');
	    }

	};


	function processSpellcastingTrait(monster, traitName, traitHandler, entityLookup) {
	    var trait = _.findWhere(monster.traits, {name: traitName});
	    if (trait) {
	        var spellList = trait.text.substring(trait.text.indexOf(':') + 1).replace('\n', ' ');
	        var castingDetails = trait.text.substring(0, trait.text.indexOf(':'));
	        var levelDetails = [];
	        var match;
	        while ((match = traitHandler.splitRegex.exec(spellList)) !== null) {
	            if (_.last(levelDetails)) {
	                _.last(levelDetails).spells = spellList.slice(0, match.index);
	            }
	            levelDetails.push(traitHandler.makeLevelDetailsObject(match));
	            spellList = spellList.slice(match.index + match[0].length);
	        }
	        if (_.last(levelDetails)) {
	            _.last(levelDetails).spells = spellList;
	        }

	        var hasCastBeforeCombat = false;
	        var spellDetailsByLevel = _.chain(levelDetails)
	          .each(function (levelDetails) {
	              levelDetails.spells = _.chain(levelDetails.spells.replace(',*', '*,').split(','))
	                .map(_.partial(_.result, _, 'trim'))
	                .map(function (spellName) {
	                    var match = spellName.match(/([^\(\*]+)(?:\(([^\)]+)\))?(\*)?/);
	                    hasCastBeforeCombat = hasCastBeforeCombat || !!match[3];
	                    return {
	                        name: match[1].trim(),
	                        restriction: match[2],
	                        castBeforeCombat: !!match[3],
	                        toString: function () {
	                            return this.name +
	                              (this.restriction ? ' (' + this.restriction + ')' : '') +
	                              (this.castBeforeCombat ? '*' : '');
	                        },
	                        toSpellArrayItem: function () {
	                            return this.name;
	                        }
	                    };
	                })
	                .each(function (spell) {
						spell.object = entityLookup.findEntity('spells', spell.name, true);
	                    if (spell.object) {
	                        spell.name = spell.object.name;
	                        spell.toSpellArrayItem = function () {
	                            return this.object;
	                        };
	                    }
	                })
	                .value();
	          })
	          .each(traitHandler.setLevelDetailsString)
	          .value();


	        trait.text = castingDetails + ':\n' + _.pluck(spellDetailsByLevel, 'newText').join('\n');
	        if (hasCastBeforeCombat) {
	            trait.text += '\n* The ' + monster.name.toLowerCase() + ' casts these spells on itself before combat.';
	        }
	        var spells = _.chain(spellDetailsByLevel)
	          .pluck('spells')
	          .flatten()
	          .map(_.partial(_.result, _, 'toSpellArrayItem'))
	          .union(monster.spells ? monster.spells : [])
	          .sortBy('name')
	          .sortBy('level')
	          .value();

	        if (!_.isEmpty(spells)) {
	            monster.spells = spells;
	        }
	    }
	    return [];
	}


	module.exports = function (monster, entityLookup) {
	    processSpellcastingTrait(monster, 'Spellcasting', spellcastingHandler, entityLookup);
	    processSpellcastingTrait(monster, 'Innate Spellcasting', innateHandler, entityLookup);
	    return monster;
	};



/***/ },
/* 12 */
/***/ function(module, exports) {

	function sanitise(statblock, logger) {
	    'use strict';

	    statblock = statblock
	      .replace(/\s+([\.,;:])/g, '$1')
	      .replace(/\n+/g, '#')
	      .replace(/–/g, '-')
	      .replace(/<br[^>]*>/g, '#')
	      .replace(/#+/g, '#')
	      .replace(/\s*#\s*/g, '#')
	      .replace(/(<([^>]+)>)/gi, '')
	      .replace(/legendary actions/gi, 'Legendary Actions')
	      .replace(/(\S)\sACTIONS/, '$1#ACTIONS')
	      .replace(/#(?=[a-z]|DC)/g, ' ')
	      .replace(/\s+/g, ' ')
	      .replace(/#Hit:/gi, 'Hit:')
	      .replace(/Hit:#/gi, 'Hit: ')
	      .replace(/#Each /gi, 'Each ')
	      .replace(/#On a successful save/gi, 'On a successful save')
	      .replace(/DC#(\d+)/g, 'DC $1')
	      .replace('LanguagesChallenge', 'Languages -\nChallenge')
	      .replace('\' Speed', 'Speed')
	      .replace(/(\w+) s([\s\.,])/g, '$1s$2')
	      .replace(/#Medium or/gi, ' Medium or')
	      .replace(/take#(\d+)/gi, 'take $1')
	      .replace(/#/g, '\n');

	    logger.debug('First stage cleaned statblock: $$$', statblock);

	    //Sometimes the texts ends up like 'P a r a l y z i n g T o u c h . M e l e e S p e l l A t t a c k : + 1 t o h i t
	    //In this case we can fix the title case stuff, because we can find the word boundaries. That will at least meaning
	    //that the core statblock parsing will work. If this happens inside the lowercase body text, however, there's nothing
	    //we can do about it because you need to understand the natural language to reinsert the word breaks properly.
	    statblock = statblock.replace(/([A-Z])(\s[a-z]){2,}/g, function (match, p1) {
	        return p1 + match.slice(1).replace(/\s([a-z])/g, '$1');
	    });


	    //Conversely, sometimes words get mushed together. Again, we can only fix this for title case things, but that's
	    //better than nothing
	    statblock = statblock.replace(/([A-Z][a-z]+)(?=[A-Z])/g, '$1 ');

	    //This covers abilites that end up as 'C O N' or similar
	    statblock = statblock.replace(/^[A-Z]\s?[A-Z]\s?[A-Z](?=\s|$)/mg, function (match) {
	        return match.replace(/\s/g, '');
	    });

	    statblock = statblock.replace(/^[A-Z ]+$/m, function (match) {
	        return match.replace(/([A-Z])([A-Z]+)(?=\s|$)/g, function (match, p1, p2) {
	            return p1 + p2.toLowerCase();
	        });
	    });


	    statblock = statblock.replace(/(\d+)\s*?plus\s*?((?:\d+d\d+)|(?:\d+))/gi, '$2 + $1');
	    var replaceObj = {
	        'Jly': 'fly',
	        ',1\'': ',*',
	        'jday': '/day',
	        'abol eth': 'aboleth',
	        'ACT IONS': 'ACTIONS',
	        'Afrightened': 'A frightened',
	        'Alesser': 'A lesser',
	        'Athl etics': 'Athletics',
	        'blindn ess': 'blindness',
	        'blind sight': 'blindsight',
	        'bofh': 'both',
	        'brea stplate': 'breastplate',
	        'Can trips': 'Cantrips',
	        'choos in g': 'choosing',
	        'com muni cate': 'communicate',
	        'Constituti on': 'Constitution',
	        'creatu re': 'creature',
	        'darkvi sion': 'darkvision',
	        'dea ls': 'deals',
	        'di sease': 'disease',
	        'di stance': 'distance',
	        'fa lls': 'falls',
	        'fe et': 'feet',
	        'exha les': 'exhales',
	        'ex istence': 'existence',
	        'lfthe': 'If the',
	        'Ifthe': 'If the',
	        'ifthe': 'if the',
	        'lnt': 'Int',
	        'magica lly': 'magically',
	        'Med icine': 'Medicine',
	        'minlilte': 'minute',
	        'natura l': 'natural',
	        'ofeach': 'of each',
	        'ofthe': 'of the',
	        'on\'e': 'one',
	        'on ly': 'only',
	        '0n': 'on',
	        'pass ive': 'passive',
	        'Perce ption': 'Perception',
	        'radi us': 'radius',
	        'ra nge': 'range',
	        'rega ins': 'regains',
	        'rest.oration': 'restoration',
	        'savin g': 'saving',
	        'si lvery': 'silvery',
	        's lashing': 'slashing',
	        'slas hing': 'slashing',
	        'slash in g': 'slashing',
	        'slash ing': 'slashing',
	        'Spel/casting': 'Spellcasting',
	        'successfu l': 'successful',
	        'ta rget': 'target',
	        ' Th e ': ' The ',
	        't_urns': 'turns',
	        'unti l': 'until',
	        'withi n': 'within',
	        'tohit': 'to hit',
	        'At wi ll': 'At will',
	        'per-son': 'person',
	        'ab ility': 'ability',
	        'spe ll': 'spell'
	    };
	    var re = new RegExp(Object.keys(replaceObj).join('|'), 'g');
	    statblock = statblock.replace(re, function (matched) {
	        return replaceObj[matched];
	    });

	    statblock = statblock
	      .replace(/,\./gi, ',')
	      .replace(/:\./g, ':')
	      .replace(/(\W)l(\W)/g,'$11$2')
	      .replace(/\.([\w])/g, '. $1')
	      .replace(/1</g, '*')
	      .replace(/(\w)ii/g, '$1ll')
	      .replace(/([a-z\/])1/g, '$1l')
	      .replace(/([a-z])\/([a-z])/g, '$1l$2')
	      .replace(/(^| )l /gm, '$11 ')
	      .replace(/ft\s\./gi, 'ft.')
	      .replace(/ft\.\s,/gi, 'ft')
	      .replace(/ft\./gi, 'ft')
	      .replace(/(\d+) ft\/(\d+) ft/gi, '$1/$2 ft')
	      .replace(/lOd/g, '10d')
	      .replace(/dl0/gi, 'd10')
	      .replace(/dlO/gi, 'd10')
	      .replace(/dl2/gi, 'd12')
	      .replace(/S(\d+)d(\d+)/gi, '5$1d$2')
	      .replace(/l(\d+)d(\d+)/gi, '1$1d$2')
	      .replace(/ld(\d+)/gi, '1d$1')
	      .replace(/l(\d+)d\s+(\d+)/gi, '1$1d$2')
	      .replace(/(\d+)d\s+(\d+)/gi, '$1d$2')
	      .replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
	      .replace(/(\d+)\s+d(\d+)/gi, '$1d$2')
	      .replace(/(\d+)d(\d)\s(\d)/gi, '$1d$2$3')
	      .replace(/(\d+)j(?:Day|day)/gi, '$1/Day')
	      .replace(/(\d+)f(?:Day|day)/gi, '$1/Day')
	      .replace(/(\d+)j(\d+)/gi, '$1/$2')
	      .replace(/(\d+)f(\d+)/gi, '$1/$2')
	      .replace(/{/gi, '(')
	      .replace(/}/gi, ')')
	      .replace(/(\d+)\((\d+) ft/gi, '$1/$2 ft')
	      .replace(/• /gi, '')
	      .replace(/’/gi, '\'');

	    logger.debug('Final stage cleaned statblock: $$$', statblock);
	    return statblock;

	}

	module.exports = sanitise;


		/***/
	},
	/* 13 */
	/***/ function (module, exports, __webpack_require__) {

		'use strict';
		var _ = __webpack_require__(3);

		var validatorFactories = {
			orderedContent: function (spec) {
				return makeContentModelValidator(spec);
			},

			unorderedContent: function (spec) {
				return makeContentModelValidator(spec);
			},

			string: function (spec) {
				if (spec.pattern) {
					if (spec.matchGroup) {
						return regExValidator(spec.name, extractRegexPart(spec.pattern, spec.matchGroup), spec.caseSensitive);
					}
					else {
						return regExValidator(spec.name, spec.pattern, spec.caseSensitive);
					}
				}
				return _.constant({errors: [], completed: []});
			},

			enumType: function (spec) {
				return function (value) {
					var result = {errors: [], completed: []};
					if (!_.some(spec.enumValues, function (enumVal) {
						return new RegExp(enumVal, 'i').test(value);
					})) {
						result.errors.push('Value "' + value + '" for field ' + spec.name + ' should have been one of [' + spec.enumValues.join(',') + ']');
					}
					return result;
				};
			},

			ability: function (spec) {
				return regExValidator(spec.name, '\\d+');
			},

			heading: function (spec) {
				return _.constant({errors: [], completed: []});
			},

			number: function (spec) {
				return function (value) {
					var result = {errors: [], completed: []};
					if (typeof value !== 'number') {
						result.errors.push('Value "' + value + '" for field ' + spec.name + ' should have been a number');
					}
					return result;
				};
			}
		};

		function extractRegexPart(regexp, matchIndex) {
			var braceCount = 0;
			var startIndex = _.findIndex(regexp, function (character, index) {
				if (character === '(' &&
				(index < 2 || regexp[index - 1] !== '\\') &&
				regexp[index + 1] !== '?') {
					return ++braceCount === matchIndex;
				}
			});

			if (startIndex === -1) {
				throw 'Fucked';
			}

			//Lose the bracket
			startIndex++;

			var openCount = 1;
			var endIndex = _.findIndex(regexp.slice(startIndex), function (character, index, regexp) {
				if (character === '(' && regexp[index - 1] !== '\\') {
					openCount++;
				}
				if (character === ')' && regexp[index - 1] !== '\\') {
					return --openCount === 0;
				}
			});

			if (endIndex === -1) {
				throw 'Fucked';
			}

			return regexp.slice(startIndex, startIndex + endIndex);
		}

		function regExValidator(fieldName, regexp, caseSensitive) {
			var re = new RegExp('^' + regexp + '$', caseSensitive ? undefined : 'i');
			return function (value) {
				var result = {errors: [], completed: []};
				if (!re.test(value)) {
					result.errors.push('Value "' + value + '" doesn\'t match pattern [' + regexp + '] for field ' + fieldName);
				}
				return result;
			};
		}

		function makeValidator(spec) {
			var validator = validatorFactories[spec.type](spec);
			validator.max = _.isUndefined(spec.maxOccurs) ? 1 : spec.maxOccurs;
			validator.min = _.isUndefined(spec.minOccurs) ? 1 : spec.minOccurs;
			validator.fieldName = spec.name;
			return validator;
		}

		function makeContentModelValidator(spec) {
			var parts = _.chain(spec.contentModel)
			.reject({type: 'heading'})
			.partition({flatten: true})
			.value();
			var flattened = _.map(parts[0], makeValidator);

			var subValidators = _.reduce(parts[1], function (subValidators, field) {
				subValidators[field.name] = makeValidator(field);
				return subValidators;
			}, {});

			return function (object, ignoreUnrecognised) {
				var results = _.reduce(object, function (results, fieldValue, fieldName) {
					var validator = subValidators[fieldName];
					if (validator) {
						results.completed.push(fieldName);
						if (_.isArray(fieldValue)) {
							if (fieldValue.length > validator.max) {
								results.errors.push('Count of ' + fieldName + ' values [' + fieldValue.length + '] exceeds maximum allowed: ' + validator.max);
							}
							else if (fieldValue.length < validator.min) {
								results.errors.push('Count of ' + fieldName + ' values [' + fieldValue.length + '] is less than minimum allowed: ' + validator.min);
							}
							else {
								_.each(fieldValue, function (arrayItem) {
									results.errors = results.errors.concat(validator(arrayItem).errors);
								});

							}
						}
						else {
							results.errors = results.errors.concat(validator(fieldValue).errors);
						}
					}
					return results;
				}, {errors: [], completed: []}
				);

				var toValidate = _.omit(object, results.completed);
				_.chain(flattened)
				.map(function (validator) {
					var result = validator(toValidate, true);
					results.completed = results.completed.concat(result.completed);
					if (result.completed.length === 0) {
						return validator;
					}
					else {
						results.errors = results.errors.concat(result.errors);
					}
					toValidate = _.omit(toValidate, result.completed);
				})
				.compact()
				.each(function (validator) {
					if (validator.min > 0) {
						results.errors.push('Missing section: ' + validator.fieldName);
					}
				});

				_.chain(subValidators)
				.omit(results.completed)
				.each(function (validator) {
					if (validator.min > 0) {
						results.errors.push('Missing field: ' + validator.fieldName);
					}
				});

				if (!ignoreUnrecognised) {
					_.chain(object)
					.omit(results.completed)
					.each(function (value, key) {
						results.errors.push('Unrecognised field: ' + key);
					});
				}


				return results;
			};
		}

		module.exports = makeValidator;


/***/ }
/******/ ]);
