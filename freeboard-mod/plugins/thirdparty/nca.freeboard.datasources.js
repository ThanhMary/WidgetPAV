(function () {
	var ncaJsonDatasource = function (settings, updateCallback) {
		var self = this;
		var updateTimer = null;
		var currentSettings = settings;
		var errorStage = 0; 	// 0 = try standard request
		// 1 = try JSONP
		// 2 = try thingproxy.freeboard.io
		var lockErrorStage = false;

		function updateRefresh(refreshTime) {
			if (updateTimer) {
				clearInterval(updateTimer);
			}

			updateTimer = setInterval(function () {
				self.updateNow();
			}, refreshTime);
		}

		updateRefresh(currentSettings.refresh * 1000);

		this.updateNow = function () {
			if ((errorStage > 1 && !currentSettings.use_thingproxy) || errorStage > 2) // We've tried everything, let's quit
			{
				return; // TODO: Report an error
			}

			var requestURL = currentSettings.url;

			if (errorStage == 2 && currentSettings.use_thingproxy) {
				requestURL = (location.protocol == "https:" ? "https:" : "http:") + "//thingproxy.freeboard.io/fetch/" + encodeURI(currentSettings.url);
			}

			var body = currentSettings.body;

			// Can the body be converted to JSON?
			if (body) {
				try {
					body = JSON.parse(body);
				}
				catch (e) {
				}
			}

			$.ajax({
				url: requestURL,
				dataType: (errorStage == 1) ? "JSONP" : "JSON",
				type: currentSettings.method || "GET",
				data: body,
				beforeSend: function (xhr) {
					try {
						_.each(currentSettings.headers, function (header) {
							var name = header.name;
							var value = header.value;

							if (!_.isUndefined(name) && !_.isUndefined(value)) {
								xhr.setRequestHeader(name, value);
							}
						});
					}
					catch (e) {
					}
				},
				success: function (data) {
					lockErrorStage = true;
				    //Initialize mydata 
					mycontext = {};
					
					//if advanced setting is true do not modify received JSON 
					if(currentSettings.advanced){
						mycontext=data;
					}
					
					//if advanced setting is false reduce received JSON nesting
					else {
					    //Get contexts 
					    contexts = data["contextResponses"];
					    contextName="";
					    for (ic = 0; ic < contexts.length; ic++) {
					        mydata = {};
						    //Get attributes 
						    attributes=data["contextResponses"][ic]["contextElement"]["attributes"];
						    contextName=data["contextResponses"][ic]["contextElement"]["id"];
						    mydata["name"] = contextName;
						    //Get each attribute and append it to mydata
						    for (i = 0; i < attributes.length; i++) {

						        //If attribute selected is position split it in latitude and longitude
						        if (attributes[i]["name"] == "position") {

						            //Get position attribute
						            position = attributes[i]["value"];

						            //Split position
						            pos_split = position.split(",");

						            //Append latitude and longitude
						            mydata["latitude"] = pos_split[0];
						            mydata["longitude"] = pos_split[1];
						        }
						        else {

						            // If attribute is not a number
						            if (isNaN(attributes[i]["value"])) {

						                // If attribute is a boolean and false append 0
						                if (attributes[i]["value"] == "false") {
						                    mydata[attributes[i]["name"]] = 0;
						                }

						                    // If attribute is a boolean and true append 1
						                else if (attributes[i]["value"] == "true") {
						                    mydata[attributes[i]["name"]] = 1;
						                }

						                    // If attribute is not a boolean or a position or a number append it
						                else {
						                    mydata[attributes[i]["name"]] = attributes[i]["value"];
						                }
						            }

						                //If attribute is a number round and append it
						            else {
						                mydata[attributes[i]["name"]] = ((parseFloat(attributes[i]["value"])).toFixed(1)).toString();
						            }
						        }
						    }
						    mycontext[contextName] = mydata;
					    }
					}
					updateCallback(mycontext);
					//updateCallback(data);
				},
				error: function (xhr, status, error) {
					if (!lockErrorStage) {
						// TODO: Figure out a way to intercept CORS errors only. The error message for CORS errors seems to be a standard 404.
						errorStage++;
						self.updateNow();
					}
				}
			});
		}

		this.onDispose = function () {
			clearInterval(updateTimer);
			updateTimer = null;
		}

		this.onSettingsChanged = function (newSettings) {
			lockErrorStage = false;
			errorStage = 0;

			currentSettings = newSettings;
			updateRefresh(currentSettings.refresh * 1000);
			self.updateNow();
		}
	};

	freeboard.loadDatasourcePlugin({
		type_name: "NCA JSON",
		settings: [
			{
				name: "url",
				display_name: "URL",
				type: "text"
			},
			{
				name: "use_thingproxy",
				display_name: "Try thingproxy",
				description: 'A direct JSON connection will be tried first, if that fails, a JSONP connection will be tried. If that fails, you can use thingproxy, which can solve many connection problems to APIs. <a href="https://github.com/Freeboard/thingproxy" target="_blank">More information</a>.',
				type: "boolean",
				default_value: true
			},
			{
				name        : "advanced",
				display_name: "Advanced",
				description: 'Advanced mode permits access to all JSON request',
				type        : "boolean"
			},
			{
				name: "refresh",
				display_name: "Refresh Every",
				type: "number",
				suffix: "seconds",
				default_value: 5
			},
			{
				name: "method",
				display_name: "Method",
				type: "option",
				options: [
					{
						name: "GET",
						value: "GET"
					},
					{
						name: "POST",
						value: "POST"
					},
					{
						name: "PUT",
						value: "PUT"
					},
					{
						name: "DELETE",
						value: "DELETE"
					}
				]
			},
			{
				name: "body",
				display_name: "Body",
				type: "text",
				description: "The body of the request. Normally only used if method is POST"
			},
			{
				name: "headers",
				display_name: "Headers",
				type: "array",
				settings: [
					{
						name: "name",
						display_name: "Name",
						type: "text"
					},
					{
						name: "value",
						display_name: "Value",
						type: "text"
					}
				]
			}
		],
		newInstance: function (settings, newInstanceCallback, updateCallback) {
			newInstanceCallback(new ncaJsonDatasource(settings, updateCallback));
		}
	});


}());
