
Parse.Cloud.define("removeOldAdverts", function(request, response) {
	var today = new Date();
	today.setMinutes(0);
	today.setSeconds(0);
	today.setMilliseconds(0);
	   
	var query = new Parse.Query("Advert");
	//query.lessThan("createdAt", today);
	query.find({
		success: function(results) {
	
			var advertsToDelete = [];
			var index = 0;
			for (var i = 0; i < results.length; i++) {
				var advert = results[i];
	  
				var checkDate = new Date(advert.createdAt);
				checkDate.setHours(checkDate.getHours()+advert.get("life_time"));
	   
				if (checkDate < today) {
					advertsToDelete[index] = advert;
					index++;
				}
			}
	  
			Parse.Object.destroyAll(advertsToDelete,
				{
					success: function() {
						response.success("removeOldAdverts success");
					},
					error: function(error) {
						if (error.code == Parse.Error.AGGREGATE_ERROR) {
							for (var i = 0; i < error.errors.length; i++) {
								console.log("Couldn't delete " + error.errors[i].object.id +
									"due to " + error.errors[i].message);
							}
						} else {
							console.log("Delete aborted because of " + error.message);
						}
						response.error("removeOldAdverts error perform delete request");
					}
				}
			);
	  
		},
		error: function() {
			response.error("removeOldAdverts error perform find request");
		}
	});
});

Parse.Cloud.define("currencyJob", function(request, response) {
	Parse.Cloud.run("removeOldAdverts")
		.then(function() {
				var AdvertClass = Parse.Object.extend("Advert");
				var lifetime = 12;
				var currency_to = "uah";
				var sourceMinfin = "minfin";
				var cities = ["Київ", "Вінниця", "Дніпропетровськ", "Донецьк", "Житомир", "Запоріжжя",
							  "Івано-Франківськ", "Кіровоград", "Луганськ", "Луцьк", "Львів", "Миколаїв",
							  "Одеса", "Полтава", "Рівне", "Суми", "Тернопіль", "Ужгород", "Харків",
							  "Херсон", "Хмельницький", "Черкаси", "Чернігів", "Чернівці"];
				var adverts = [];

				Parse.Cloud.httpRequest({
					url: "http://resources.finance.ua/ua/app-menyala/orders",
					success: function(httpResponse) {
						var data = JSON.parse(httpResponse.text);
						var id = data.id;
						var time = data.time;
						var currency = data.currency;
						var type = data.type;
						var rate = data.rate;
						var amount = data.amount;
						var city = data.city;
						var phone = data.phone;
						var contact = data.contact;
						var region = data.region;
						var priority = data.priority;
						
						var index = 0;
						var hour = new Date().getHours() - 1 + 3;
						if (hour == -1) {
							hour = 23;
						}
						var kiev = 0;
						for (var i=0; i<id.length; i++) {
							var cityIndex = cities.indexOf(city[i]);
							var currency_from = currency[i].toLowerCase();
							if (cityIndex != -1 && (currency_from == "usd" || currency_from == "eur" || currency_from == "rub")) {
								var advert = new AdvertClass();
								advert.set("amount", parseInt(amount[i]));
								advert.set("rate", parseFloat(rate[i]));
								advert.set("phone_number", phone[i].substring(2));
								advert.set("comment", contact[i]);
								advert.set("currency_from", currency_from);
								advert.set("currency_to", currency_to);
								advert.set("life_time", lifetime);
								advert.set("who_ride", 0);
								advert.set("enabled", true);
								advert.set("country_id", 0);
								advert.set("city_id", cityIndex);
								advert.set("in_parts", false);
								advert.set("source", sourceMinfin);
								advert.set("source_time", hour + ":" + getRandomArbitrary(0, 60)); 
								advert.set("source_date", new Date(time[i] * 1000)); 
								advert.set("buy_sell", type[i]);
								adverts[index] = advert;
								index++;
								if (cityIndex == 0) {
									kiev++;
								}
							}
							if (kiev == 50) {
								break;
							}
						}
					},
					error: function(httpResponse) {
						response.error("http error " + httpResponse.status);
					}
				}).then( function() {
					if (adverts.length > 0) {
						Parse.Cloud.run("deleteSourced")
							.then(function() {
									Parse.Object.saveAll(adverts,
									{
										success: function() {
											response.success('job success');
										},
										error: function(error) {
											response.error('save all error' + error.toString());
										}
									});
								}, 
								function(error) {
									response.error('deleteSourced error' + error.toString());
								}
							);
					} else {
						response.success('job success, nothing changed');
					}
				}, function(error) {
					response.error("http request error " + error.toString());
				});
			}, 
			function(error) {
				response.error("removeOldAdverts error " + error.toString());
			}
		);
});

Parse.Cloud.define("deleteSourced", function(request, response) {
	var query = new Parse.Query("Advert");
	query.notEqualTo("source", "");
	query.find({
		success: function(results) {
			Parse.Object.destroyAll(results,
				{
					success: function() {
						response.success('deleteSourced success');
					},
					error: function(error) {
						if (error.code == Parse.Error.AGGREGATE_ERROR) {
							for (var i = 0; i < error.errors.length; i++) {
								console.log("Couldn't delete sourced " + error.errors[i].object.id +
									"due to " + error.errors[i].message);
							}
						} else {
							console.log("Delete aborted because of " + error.message);
						}
						response.error('deleteSourced error delete');
					}
				}
			);
		},
		error: function() {
			response.error('deleteSourced error find');
		}
	});
});

function getRandomArbitrary(min, max) {
    return parseInt(Math.random() * (max - min) + min);
}