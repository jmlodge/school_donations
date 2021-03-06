/**
 * Created by Joseph on 23/01/2017.
 */
queue()
    .defer(d3.json, "/donorsUS/projects")
    .defer(d3.json, "static/geojson/us-states.json")
    .await(makeGraphs);

function makeGraphs(error, projectsJson, statesJson) {
    //clean projectJson data
    var donorsUSProjects = projectsJson;
    var dateFormat = d3.time.format("%Y-%m-%d %H:%M:%S");
    var numberFormat = d3.format(",f");
    donorsUSProjects.forEach(function (d) {
       d["date_posted"] = dateFormat.parse(d["date_posted"]);
       d["date_posted"].setDate(1);
       d["total_donations"] = +d["total_donations"];
    });

    //create crossfilter instance
    var ndx = crossfilter(donorsUSProjects);

    //define dimensions
    var dateDim = ndx.dimension(function (d) {
        return d["date_posted"];
    });
    var resourceTypeDim = ndx.dimension(function (d) {
       return d["resource_type"];
    });
    var povertyLevelDim = ndx.dimension(function (d) {
       return d["poverty_level"];
    });
    var stateDim = ndx.dimension(function (d) {
       return d["school_state"];
    });
    //var totalDonationsDim = ndx.dimension(function (d) {
    //   return d["total_donations"];
    //});
    var fundingStatus = ndx.dimension(function (d) {
       return d["funding_status"];
    });
    var primaryFocusSubDim =ndx.dimension(function (d) {
        return d["primary_focus_subject"];
    });

    //calc metrics
    var numProjectsByDate = dateDim.group();
    var numProjectsByResourceType = resourceTypeDim.group();
    var numProjectsByPovertyLevel = povertyLevelDim.group();
    //var stateGroup = stateDim.group();
    var totalDonationsByState = stateDim.group().reduceSum(function (d) {
       return d["total_donations"];
    });
    var numProjectsByFundingStatus = fundingStatus.group();
    var numPrimaryFocusSub = primaryFocusSubDim.group();


    var all = ndx.groupAll();
    var totalDonations = ndx.groupAll().reduceSum(function (d) {
       return d["total_donations"];
    });

    var max_state = totalDonationsByState.top(1)[0].value;

    //define values (to be used in charts)
    var minDate = dateDim.bottom(1)[0]["date_posted"];
    var maxDate = dateDim.top(1)[0]["date_posted"];

    //charts
    var timeChart = dc.barChart("#time-chart");
    var resourceTypeChart = dc.rowChart("#resource-type-row-chart");
    var povertyLevelChart = dc.rowChart("#poverty-level-row-chart");
    var numberProjectsND = dc.numberDisplay("#number-projects-nd");
    var totalDonationsND = dc.numberDisplay("#total-donations-nd");
    var fundingStatusChart = dc.pieChart("#funding-chart");
    var usChart = dc.geoChoroplethChart("#us-chart");
    //var selectField = dc.selectMenu('#menu-select');
    var primaryFocusSubChart = dc.pieChart("#pri-focus-chart");

    var colourScale = d3.scale.ordinal().range(["#ffe4b2", "#ffc966", "#ffa500", "#cc8400", "#996300"]);

    //selectField
      // .dimension(stateDim)
      // .group(stateGroup)
      // .title(function (d) {
      //     return 'State: ' + d.key;
      // });

     // tooltips for pie chart
    var toolTip = d3.select("body")
        .append("div")
        .classed("hidden", true)
        .attr("id", "tooltip");

    numberProjectsND
       .formatNumber(d3.format("d"))
       .valueAccessor(function (d) {
           return d;
       })
       .group(all);

    totalDonationsND
       .formatNumber(d3.format("d"))
       .valueAccessor(function (d) {
           return d;
       })
       .group(totalDonations)
       .formatNumber(d3.format(".3s"));

    timeChart
        .width(800)
        .height(330)
        .colors(colourScale)
        .margins({top: 10, right: 50, bottom: 30, left: 50})
        .dimension(dateDim)
        .group(numProjectsByDate)
        .transitionDuration(500)
        .x(d3.time.scale().domain([minDate, maxDate]))
        .elasticY(true)
        .xAxisLabel("Year")
        .yAxis().ticks(4);

    primaryFocusSubChart
        .height(250)
        .radius(90)
        .innerRadius(40)
        .colors(colourScale)
        .transitionDuration(1500)
        .dimension(primaryFocusSubDim)
        .group(numPrimaryFocusSub)
        .transitionDuration(600)
        .on("mouseover", function(d){
            d3.select("#tooltip")
                .classed("hidden", false)
                .style("left", d3.event.pageX - 10 + "px")
                .style("top", d3.event.pageY - 70 + "px");
            toolTip.html(d);
        })
        .on("mouseout", function(){
            d3.select("#tooltip")
                .classed("hidden", true);
        });

    resourceTypeChart
        .width(300)
        .height(250)
        .colors(colourScale)
        .dimension(resourceTypeDim)
        .group(numProjectsByResourceType)
        .ordering(function(d) {
            return +d.value
        })
        .xAxis().ticks(4);

    povertyLevelChart
        .width(300)
        .height(250)
        .colors(colourScale)
        .dimension(povertyLevelDim)
        .group(numProjectsByPovertyLevel)
        .ordering(function(d) {
            return +d.value
        })
        .xAxis().ticks(4);

    fundingStatusChart
        .height(250)
        .radius(90)
        .innerRadius(40)
        .colors(colourScale)
        .transitionDuration(1500)
        .dimension(fundingStatus)
        .group(numProjectsByFundingStatus);

    usChart
        .width(1000)
        .height(330)
        .dimension(stateDim)
        .group(totalDonationsByState)
        .colors(["#ffe4b2", "#ffc966", "#ffa500", "#cc8400", "#996300"])
        .colorDomain([0, max_state])
        .overlayGeoJson(statesJson["features"], "states", function (d) {
           return d.properties.name;
        })
        .projection(d3.geo.albersUsa()
           .scale(600)
           .translate([340, 150]))
        .title(function (p) {
           return "States: " + p.key + "\nTotal Donations: " + Math.round(p["value"]) + "$";
        });

   dc.renderAll();
}
