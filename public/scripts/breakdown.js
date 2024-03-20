const femaleColor = '#b862fd';
const maleColor = '#d69e62';
let ethnicityDataStaff;
let ethnicityDataBoard;
let ethnicityDataSenior;
let this_org_data;
let currentGenderData;


d3.csv('data/Candid-Trimmed.csv').then(function (data) {
    data.forEach(function (d) {
        delete d['']; // Removes unneeded columns that may or may not exist
        delete d['Unnamed: 0'];
        delete d['Unnamed: 0.1'];
    });


    const params = new URLSearchParams(window.location.search)
    const ein = params.get('ein');

    // Find the current org's data
    // TODO: Replace with API call
    this_org_data = data.find(org => org.ein === ein)
    console.log(this_org_data)

    // Add text 'Women are paid X% more/less
    const more_or_less = this_org_data.average_female_salary > this_org_data.average_male_salary ? "more" : "less"
    const payGapText = `Women are paid <span class='percentHighlight'>${Math.round(Math.abs(this_org_data.pay_gap))}% ${more_or_less}</span> than men at ${this_org_data.org_name}`

    document.querySelector("#companyName").insertAdjacentHTML('beforeend', this_org_data.org_name);
    // TODO: Add website link (we have this)
    document.querySelector("#payGapText").innerHTML = payGapText;

    // Create score gauge
    createGauge(this_org_data.total_score)

    // Add bars for score categories
    const leadership_score = parseInt(this_org_data['Trustees']) + parseInt(this_org_data['Highest Compensated']) + parseInt(this_org_data['Officers'])
    let leadership_bar = `
    <div class="cat-score-container">
      <div class="rectangle" style="width: ${leadership_score / 30 * 100}%"></div>
    </div>
    `
    document.querySelector("#leadership").insertAdjacentHTML('beforeend', leadership_bar);

    const pay_score = parseInt(this_org_data['Pay Gap']) + parseInt(this_org_data['Average Salary']) + parseInt(this_org_data['CEO Pay Ratio'])
    let pay_bar = `
    <div class="cat-score-container">
      <div class="rectangle" style="width: ${pay_score / 20 * 100}%"></div>
    </div>
    `
    document.querySelector("#pay").insertAdjacentHTML('beforeend', pay_bar);


    const diversity_score = parseInt(this_org_data['Candid Reporting']) + parseInt(this_org_data['Diversity Reporting'])

    let diversity_bar = `
    <div class="cat-score-container">
      <div class="rectangle" style="width: ${diversity_score / 10 * 100}%"></div>
    </div>
    `
    document.querySelector("#diversity").insertAdjacentHTML('beforeend', diversity_bar);

    // Create and add all visualzations
    genderDataStaff = getGenderDataStaff(this_org_data);
    genderDataSenior = getGenderDataSenior(this_org_data);
    genderDataBoard = getGenderDataBoard(this_org_data);
    createBoardGenderCompositionViz("board")
    createPayGraph(this_org_data)
    createCircleComparison(this_org_data)
    ethnicityDataStaff = getEthnicityDataStaff(this_org_data);
    ethnicityDataSenior = getEthnicityDataSenior(this_org_data);
    ethnicityDataBoard = getEthnicityDataBoard(this_org_data);
    createDiversityGraph(this_org_data, "board");



}).catch(function (error) {
    console.error('Error loading data: ', error);
});

function getCurrentGenderData(genderDataString) {
    return currentGenderData;
}


function createBoardGenderCompositionViz(genderDataString) {

    let genderData;
    let titleText;

    switch (genderDataString) {
        case "senior":
            genderData = genderDataSenior;
            titleText = "Senior Staff";
            break;
        case "board":
            genderData = genderDataBoard;
            titleText = "Board"
            break;
        case "staff":
            genderData = genderDataStaff;
            titleText = "Staff"
            break;
        default:
            return;
    }

    /* Keeping this global because the tooltip won't work otherwise, oddly */
    currentGenderData = genderData;

    const width = 600, height = 450;
    const radius = Math.min(width, height) / 2 - 40;

    const svgExists = d3.select("#leadershipGraph svg").empty() === false;
    let svg;

    if (!svgExists) {
        svg = d3.select("#leadershipGraph")
            .append("svg")
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", "translate(" + (width / 2 + 50) + "," + height / 2 + ")");
    } else {
        svg = d3.select("#leadershipGraph svg g");
    }


    const color = d3.scaleOrdinal()
        .domain(["Female", "Male", "Non-Binary", "Decline to State", "Unknown"])
        .range([femaleColor, maleColor, "green", "purple", "grey"]);

    const pie = d3.pie()
        .value(d => d[1]);


    let data_ready = pie(Object.entries(genderData));



    let total = Object.entries(genderData).reduce((acc, curr) => acc + (+curr[1]), 0);



    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);



    const paths = svg.selectAll('path')
        .data(data_ready, d => d.data[0]);



    paths.enter()
        .append('path')
        .on("mouseover", function (event, d) {
            let currentTotal = Object.entries(getCurrentGenderData()).reduce((acc, curr) => acc + (+curr[1]), 0);
            let categoryCount = d.data[1];
            let categoryPercentage = ((parseFloat(categoryCount) / parseFloat(currentTotal)) * 100).toFixed(2);

            d3.select("#tooltip")
                .style("display", "block")
                .html(d.data[0] + ": " + ((parseFloat(categoryCount) / parseFloat(currentTotal)) * 100).toFixed(2) + "% (" + categoryCount + " members)")
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 20) + "px");
        })
        .on("mouseout", function () {
            d3.select("#tooltip").style("display", "none");
        })
        .style("opacity", 0.7)
        .attr('fill', d => color(d.data[0]))
        .attr('d', arc)
        .each(function (d) { this._current = d; }) // Store the initial angles for transitions
        .merge(paths) // Combine enter and update selections
        .transition() // Apply transition on both entering and updating elements
        .duration(1500)
        .attrTween('d', function (d) {
            const interpolate = d3.interpolate(this._current, d);
            this._current = interpolate(0);
            return function (t) {
                return arc(interpolate(t));
            };
        })


    paths.exit()
        .transition()
        .duration(1500)
        .attrTween('d', function (d) {
            const interpolate = d3.interpolate(this._current, { startAngle: 2 * Math.PI, endAngle: 2 * Math.PI });
            return function (t) {
                return arc(interpolate(t));
            };
        })
        .remove();

    svg.select("#compTitle").remove();
    svg.select("#totalMembers").remove();
    svg.select("#legendRect").remove();
    // Add a title
    svg.append("text")
        .attr("id", "compTitle")
        .attr("x", 0)
        .attr("y", -height / 2 + 15)
        .text(titleText + " Composition by Gender")
        .attr("text-anchor", "middle")
        .style("font-size", "20px")
        .style("font-weight", "bold")
        .attr("font-family", "Raleway");

    // Add a label for the total number of board members
    svg.append("text")
        .attr("id", "totalMembers")
        .attr("x", 0)
        .attr("y", -height / 2 + 35)
        .text("Total Members: " + total)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .style("font-weight", "bold")
        .attr("font-family", "Raleway");

    const legendSpacing = 5;
    const legendRectSize = 18;
    const legendX = -width / 2 - 35;
    const legendY = -height / 2 + legendRectSize * 3;

    svg.append("rect")
        .attr("id", "legendRect")
        .attr("x", legendX - legendSpacing)
        .attr("y", legendY - legendRectSize)
        .attr("width", 130)
        .attr("height", legendRectSize * 7 + legendSpacing)
        .attr("fill", "grey")
        .style("opacity", 0.3)
        .attr("rx", 10)
        .attr("ry", 10);

    const data = [
        { gender: 'Male', color: maleColor },
        { gender: 'Female', color: femaleColor },
        { gender: "Non-Binary", color: "green" },
        { gender: "Decline to State", color: "purple" },
        { gender: "Unknown", color: "grey" },
    ];

    const legend = svg.selectAll(".legend")
        .data(data)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${legendX},${legendY + i * (legendRectSize + legendSpacing)})`);

    legend.append("circle")
        .attr("r", legendRectSize / 2)
        .attr("cx", legendRectSize / 2)
        .attr("fill", d => d.color);

    legend.append("text")
        .attr("x", legendRectSize + legendSpacing)
        .attr("y", legendRectSize / 3.5)
        .attr("font-size", ".75rem")
        .text(d => d.gender)
        .style("font-family", "sans-serif");
}

function createCircleComparison(orgData) {

    d3.select('#payGraph svg').remove();

    highest_salary = Math.round(+orgData.highest_salary);
    avg_employee_comp = Math.round(+orgData.avg_employee_comp);

    const width = 550, height = 550;
    const svg = d3.select("#payGraph").append("svg").attr("width", width).attr("height", height);
    const scaleFactor = 0.0001;

    const hierarchyData = {
        "name": "Salaries",
        "children": [
            { "name": "Highest Salary", "value": highest_salary * scaleFactor, "color": "#ff883a" },
            { "name": "Average Employee Salary", "value": avg_employee_comp * scaleFactor, "color": "#3fd796" }
        ]
    };

    const pack = d3.pack().size([width, height]).padding(5);
    const root = d3.hierarchy(hierarchyData).sum(d => d.value);
    const nodes = pack(root).descendants();

    const node = svg.selectAll(".node")
        .data(nodes.filter(d => d.depth === 1))
        .join("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x}, ${d.y})`)


    node.append("circle")
        .attr("r", d => d.r)
        .style("fill", d => d.data.color)
        .style("stroke-width", 4)

    node.append("text")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "central")
        .text(d => formatNumberAbbreviated(d.data.value / scaleFactor))
        .attr("fill", "black")
        .attr("font-family", "Poppins")
        .attr("font-size", "1.2rem")


    svg.append("text")
        .attr("x", width / 2)
        .attr("y", 20)
        .text("CEO vs Average Employee")
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-family", "Raleway")
        .style("fill", "black");

    const drag = d3.drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);

    node.call(drag)

    node.on("mouseover", function (event, d) {
        d3.select("#tooltip")
            .style("display", "block")
            .html(d.data.name + "<br>$" + Intl.NumberFormat().format(Math.round(d.data.value / scaleFactor)))
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 20) + "px");
    })
        .on("mouseout", function () {
            d3.select("#tooltip").style("display", "none");
        });



    const simulation = d3.forceSimulation()
        .force("center", d3.forceCenter().x(width / 2).y(height / 2))

    simulation
        .nodes(nodes)
        .on("tick", () => {
            node
                .attr("cx", function (d) {
                    return d.x = Math.max(d.r, Math.min(width - d.r, d.x));
                })
                .attr("cy", function (d) {
                    return d.y = Math.max(d.r, Math.min(height - d.r, d.y));
                })
                .attr("transform", function (d) {
                    return `translate(${Math.max(d.r, Math.min(width - d.r, d.x))}, ${Math.max(d.r, Math.min(height - d.r, d.y))})`
                })

        });



    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(.03).restart();
        d.fx = d.x;
        d.fy = d.y;
    }

    function dragged(event, d) {
        d.fx = event.x;
        d.fy = event.y;
        d3.select(this)
            .attr("transform", `translate(${event.x}, ${event.y})`);
        d.x = event.x;
        d.y = event.y;
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(.03);
        d.fx = null;
        d.fy = null;
    }

}

function createDiversityGraph(orgData, ethnicityDataString) {
    let ethnicityData;
    let titleText;
    switch (ethnicityDataString) {
        case "senior":
            ethnicityData = getEthnicityDataSenior(orgData);
            titleText = "Senior Staff";
            break;
        case "board":
            ethnicityData = getEthnicityDataBoard(orgData);
            titleText = "Board Members"
            break;
        case "staff":
            ethnicityData = getEthnicityDataStaff(orgData);
            titleText = "Total Staff"
            break;
        default:
            return;
    }

    // If the SVG doesn't exist, create it. Otherwise, select the existing SVG.
    const svgExists = d3.select("#diversityGraph svg").empty() === false;
    let svg;
    const margin = { top: 100, right: 30, bottom: 150, left: 70 },
        width = d3.select('body').node().getBoundingClientRect().width * 0.75 - margin.left - margin.right,
        height = 500 - margin.top - margin.bottom;

    if (!svgExists) {
        svg = d3.select("#diversityGraph")
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
    } else {
        svg = d3.select("#diversityGraph svg g");
    }

    // Update the scales
    const x = d3.scaleBand()
        .range([0, width])
        .domain(ethnicityData.map(d => d.ethnicity))
        .padding(0.2);

    const y = d3.scaleLinear()
        .domain([0, d3.max(ethnicityData, d => d.count)])
        .range([height, 0]);

    // Update the axes
    if (!svgExists) {
        svg.append("g")
            .attr("transform", `translate(0, ${height})`)
            .attr("class", "x-axis");

        svg.append("g")
            .attr("class", "y-axis");
    }

    d3.select(".x-axis").transition().duration(1000)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0) rotate(-45)")
        .style("text-anchor", "end")
        .style("font-size", "0.8rem");

    d3.select(".y-axis").transition().duration(1000)
        .call(d3.axisLeft(y).tickFormat(d3.format('d')));

    // Bind the new data
    const bars = svg.selectAll(".bar")
        .data(ethnicityData, d => d.ethnicity);

    // Enter new bars
    bars.enter().append("rect")
        .attr("class", "bar")
        .attr("x", d => x(d.ethnicity))
        .attr("width", x.bandwidth())
        .attr("fill", "#3fd796")
        .attr("y", height)
        .attr("height", 0)
        .merge(bars) // Apply changes to both new and updating bars
        .transition().duration(1000)
        .attr("x", d => x(d.ethnicity))
        .attr("y", d => y(d.count))
        .attr("height", d => height - y(d.count));

    // Remove old bars
    bars.exit()
        .transition().duration(1000)
        .attr("y", height)
        .attr("height", 0)
        .remove();

    svg.select("#x-axis-text").remove();
    svg.select("#y-axis-text").remove();


    // X axis label
    svg.append("text")
        .attr("id", "x-axis-text")
        .attr("text-anchor", "end")
        .attr("x", width / 2 + margin.left)
        .attr("y", height + margin.top + 20)
        .text("Ethnicity")

    // Y axis label
    svg.append("text")
        .attr("id", "y-axis-text")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -margin.top)
        .text("Staff Count");

    svg.select("#title").remove();
    svg.append("text")
        .attr("x", width / 2)
        .attr("y", -50)
        .attr("id", "title")
        .text(titleText)
        .attr("text-anchor", "middle")
        .style("font-size", "24px")
        .style("font-family", "Raleway")
        .style("fill", "black");

}

function createGauge(score) {
    const n = 5;
    const colors = ["#FF0000", "#FFA500", "#FFFF00", "#008000", "#0000FF"];
    const sectionAngle = Math.PI / n;

    const width = 500;
    const height = 475;
    const margin = { top: 20, right: 20, bottom: 20, left: 0 };

    const needleLength = 200;
    const needlePivotX = width / 2;
    const needlePivotY = height * 0.75;

    const svg = d3
        .select(`.circleGraphSpot`)
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Create an arc for each section
    for (let i = 0; i < n; i++) {
        const startAngle = -Math.PI / 2 + i * sectionAngle;
        const endAngle = startAngle + sectionAngle;

        const sectionArc = d3
            .arc()
            .innerRadius(120)
            .outerRadius(180)
            .startAngle(startAngle)
            .endAngle(endAngle)
            .cornerRadius(4);

        svg
            .append("path")
            .attr("d", sectionArc)
            .attr("transform", `translate(${width / 2}, ${height * 0.75})`)
            .style("fill", colors[i % colors.length]);
    }
    // Base of needle
    svg
        .append("circle")
        .attr("cx", needlePivotX)
        .attr("cy", needlePivotY)
        .attr("r", 2.5)
        .style("fill", "black")
        .style("stroke", "none");

    const needleAngle = scoreToAngle(score) * (180 / Math.PI);

    svg
        .append("line")
        .attr("x1", needlePivotX)
        .attr("y1", needlePivotY)
        .attr("x2", needlePivotX)
        .attr("y2", needlePivotY - needleLength)
        .style("stroke", "black")
        .style("stroke-width", 2)
        .attr(
            "transform",
            `rotate(${needleAngle}, ${needlePivotX}, ${needlePivotY})`
        );

    const score_color = colors[Math.floor(score / 20)];
    svg
        .append("text")
        .attr("x", needlePivotX)
        .attr("y", needlePivotY - 70)
        .text(`${score}/100`)
        .attr("text-anchor", "middle")
        .style("font-size", "1.5rem")
        .style("font-family", "Poppins")
        .style("fill", "#5e5b5b");
}

function createPayGraph(orgData) {

    d3.select('#highestPaidGraph svg').remove();


    const data = [
        { gender: 'Male', compensation: orgData.average_male_salary, color: maleColor },
        { gender: 'Female', compensation: orgData.average_female_salary, color: femaleColor }
    ];

    const tooltip = d3.select("#tooltip");


    // https://observablehq.com/@d3/horizontal-bar-chart/2
    const barHeight = 25;
    const marginTop = 30;
    const marginRight = 0;
    const marginBottom = 85;
    const marginLeft = 30;
    const width = 750;
    const height = Math.ceil(4 * barHeight) + marginTop + marginBottom + 50;



    const x = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.compensation)])
        .range([marginLeft, width - marginRight]);

    const y = d3.scaleBand()
        .domain(["Male", "Female"])
        .range([marginTop, height - marginBottom])

    const svg = d3.select("#highestPaidGraph")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .attr("viewBox", [0, 0, width, height])
        .attr("style", "max-width: 100%; height: auto; font: 10px sans-serif;");

    const bars = svg.append("g")
        .selectAll()
        .data(data)
        .join("rect")
        .attr("x", x(0))
        .attr("y", (d) => y(d.gender))
        .attr("fill", (d) => d.gender == "Female" ? femaleColor : maleColor)
        .attr("width", (d) => x(d.compensation) - x(0))
        .attr("height", y.bandwidth());

    svg.append("g")
        .attr("transform", `translate(0,${marginTop})`)

    svg.append("g")
        .attr("transform", `translate(${marginLeft},0)`)

    svg.append("g")
        .attr("fill", "black")
        .attr("text-anchor", "end")
        .selectAll()
        .data(data)
        .join("text")
        .attr("x", (d) => x(d.compensation))
        .attr("y", (d) => y(d.gender) + y.bandwidth() / 2)
        .attr("dy", "0.35em")
        .attr("dx", -4)
        .attr("font-size", "1.3rem")
        .text((d) => formatNumberAbbreviated(d.compensation))
        .attr("font-family", "Poppins")

    svg.append("text")
        .attr("x", marginLeft)
        .attr("y", marginTop / 2)
        .attr("text-anchor", "right")
        .attr("font-size", "1.2rem")
        .attr("font-family", "Raleway")
        .text("Highest Paid Employee Avg Compensation");


    const legendSpacing = 5;
    const legendRectSize = 18;
    const legendX = marginLeft - 15;
    const legendY = height - marginBottom / 2;

    svg.append("rect")
        .attr("x", legendX - 5)
        .attr("y", legendY - legendRectSize)
        .attr("width", 120)
        .attr("height", legendRectSize * 3 + legendSpacing)
        .attr("fill", "grey")
        .style("opacity", 0.3)
        .attr("rx", 10)
        .attr("ry", 10);

    const legend = svg.selectAll(".legend")
        .data(data)
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", (d, i) => `translate(${legendX},${legendY + i * (legendRectSize + legendSpacing)})`);

    legend.append("circle")
        .attr("r", legendRectSize / 2)
        .attr("cx", legendRectSize / 2)
        .attr("fill", d => d.color);

    legend.append("text")
        .attr("x", legendRectSize + legendSpacing)
        .attr("y", legendRectSize / 3.5)
        .attr("font-size", ".75rem")
        .text(d => d.gender);

    // Tooltip functionality
    bars.on("mouseover", function (event, d) {
        tooltip.style("display", "block");
    })
        .on("mousemove", function (event, d) {
            tooltip.html(`${d.gender}:<br> $${Intl.NumberFormat().format(Math.round(d.compensation))}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
            tooltip.style("display", "none");
        });

}

function formatNumberAbbreviated(num) {
    if (num >= 1000) {
        const abbreviatedNum = num / 1000;

        const formatter = new Intl.NumberFormat('en-US', {
            maximumFractionDigits: 0,
            minimumFractionDigits: 0
        });

        return formatter.format(abbreviatedNum) + 'K';
    } else {
        const formatter = new Intl.NumberFormat('en-US');
        return formatter.format(num);
    }
}

function getEthnicityDataBoard(orgData) {
    return [
        { ethnicity: "Asian", count: +orgData.asian_board },
        { ethnicity: "Black", count: +orgData.black_board },
        { ethnicity: "Hispanic", count: +orgData.hispanic_board },
        { ethnicity: "Middle Eastern", count: +orgData.middle_eastern_board },
        { ethnicity: "Native American", count: +orgData.native_american_board },
        { ethnicity: "Pacific Islander", count: +orgData.pacific_islander_board },
        { ethnicity: "White", count: +orgData.white_board },
        { ethnicity: "Multi-Racial", count: +orgData.multi_racial_board },
        { ethnicity: "Other", count: +orgData.other_ethnicity_board },
        { ethnicity: "Decline to state", count: +orgData.race_decline_to_state_board },
        { ethnicity: "Unknown", count: +orgData.race_unknown_board },
    ];
}

function getEthnicityDataSenior(orgData) {
    return [
        { ethnicity: "Asian", count: +orgData.asian_senior_staff },
        { ethnicity: "Black", count: +orgData.black_senior_staff },
        { ethnicity: "Hispanic", count: +orgData.hispanic_senior_staff },
        { ethnicity: "Middle Eastern", count: +orgData.middle_eastern_staff },
        { ethnicity: "Native American", count: +orgData.native_american_senior_staff },
        { ethnicity: "Pacific Islander", count: +orgData.pacific_islander_senior_staff },
        { ethnicity: "White", count: +orgData.white_senior_staff },
        { ethnicity: "Multi-Racial", count: +orgData.multi_racial_senior_staff },
        { ethnicity: "Other", count: +orgData.other_ethnicity_senior_staff },
        { ethnicity: "Decline to state", count: +orgData.race_decline_to_state_senior_staff },
        { ethnicity: "Unknown", count: +orgData.race_unknown_senior_staff },
    ];
}

function getEthnicityDataStaff(orgData) {
    return [
        { ethnicity: "Asian", count: +orgData.asian_staff },
        { ethnicity: "Black", count: +orgData.black_staff },
        { ethnicity: "Hispanic", count: +orgData.hispanic_staff },
        { ethnicity: "Middle Eastern", count: +orgData.middle_eastern_staff },
        { ethnicity: "Native American", count: +orgData.native_american_staff },
        { ethnicity: "Pacific Islander", count: +orgData.pacific_islander_staff },
        { ethnicity: "White", count: +orgData.white_staff },
        { ethnicity: "Multi-Racial", count: +orgData.multi_racial_staff },
        { ethnicity: "Other", count: +orgData.other_ethnicity_staff },
        { ethnicity: "Decline to state", count: +orgData.race_decline_to_state_staff },
        { ethnicity: "Unknown", count: +orgData.race_unknown_staff },
    ];
}

function getGenderDataBoard(orgData) {
    return {
        "Female": orgData.female_board,
        "Male": orgData.male_board,
        "Non-Binary": orgData.non_binary_board,
        "Decline to State": orgData.gender_decline_to_state_board,
        "Unknown": orgData.gender_unknown_board
    }
}

function getGenderDataSenior(orgData) {
    return {
        "Female": orgData.female_senior_staff,
        "Male": orgData.male_senior_staff,
        "Non-Binary": orgData.non_binary_senior_staff,
        "Decline to State": orgData.gender_decline_to_state_senior_staff,
        "Unknown": orgData.gender_unknown_senior_staff
    }
}

function getGenderDataStaff(orgData) {
    return {
        "Female": orgData.female_staff,
        "Male": orgData.male_staff,
        "Non-Binary": orgData.non_binary_staff,
        "Decline to State": orgData.gender_decline_to_state_staff,
        "Unknown": orgData.gender_unknown_staff
    }
}

function scoreToAngle(score) {
    // Assuming score is in range 0-100
    const maxScore = 100;
    const angleRange = Math.PI;
    return (score / maxScore) * angleRange - angleRange / 2;
}





document.querySelector("#ethnicityBtnGroup button#senior").addEventListener("click", function () {
    createDiversityGraph(this_org_data, "senior")
});
document.querySelector("#ethnicityBtnGroup button#board").addEventListener("click", function () {
    createDiversityGraph(this_org_data, "board")
});
document.querySelector("#ethnicityBtnGroup button#staff").addEventListener("click", function () {
    createDiversityGraph(this_org_data, "staff")
});

document.querySelectorAll('#ethnicityBtnGroup button').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('#ethnicityBtnGroup button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});

document.querySelector("#genderBtnGroup button#senior").addEventListener("click", function () {
    createBoardGenderCompositionViz("senior")
});
document.querySelector("#genderBtnGroup button#board").addEventListener("click", function () {
    createBoardGenderCompositionViz("board")
});
document.querySelector("#genderBtnGroup button#staff").addEventListener("click", function () {
    createBoardGenderCompositionViz("staff")
});

document.querySelectorAll('#genderBtnGroup button').forEach(button => {
    button.addEventListener('click', function () {
        document.querySelectorAll('#genderBtnGroup button').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
    });
});
