// var lastScrollTop;
// navbar = document.getElementById('navbar');
// window.addEventListener('scroll',function(){
// var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
// if(scrollTop > lastScrollTop){
//     navbar.style.top='-80px';
// }
// else{
//     navbar.style.top='0';
// }
// lastScrollTop = scrollTop;
// });


let data_candid;
let data_990;

let curr_rank = 0;
let currentPage = 1;
const recordsPerPage = 50;
let filteredData = [];
let currentData = [];
let allData = [];

function changePage(increment) {
    const numPages = Math.ceil(data_candid.length / recordsPerPage);
    lastPage = currentPage;
    currentPage += increment;

    if (currentPage < 1) currentPage = 1;
    if (currentPage > numPages) currentPage = numPages;

    curr_rank = currentPage * 50 - 50;

    document.getElementById('currentPage').textContent = currentPage;

    const startIdx = (currentPage - 1) * recordsPerPage;
    const endIdx = startIdx + recordsPerPage;
    currentData = allData.slice(startIdx, endIdx);

    renderData();
}

function renderData() {
    const container = document.querySelector('.data-rows');
    container.innerHTML = ``;

    let toRender = [];

    if (filteredData.length > 0) {
        toRender = filteredData;
    } else {
        toRender = currentData;
    }

    toRender.forEach(function (org) {
        curr_rank++;
        let score = org.total_score;

        const orgHtml = `
            <div class="org-row" data-ein="${org.ein}">
                <div class="input-rank">#${curr_rank}</div>
                <div class="input-org">${org.org_name}</div>
                <div class="score-container">
                    <div class="rectangle" style="width: ${score}%"></div>
                </div>
                <div class="score">${score}</div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', orgHtml);

    });
    document.querySelectorAll('.org-row').forEach(row => {
        row.addEventListener('click', function () {
            const ein = this.getAttribute('data-ein');
            window.location.href = `${window.location.href}breakdown.html?ein=${ein}`;
        });
    });
}


Promise.all([
    d3.csv('data/Candid-Trimmed.csv'),
    d3.csv('data/990-Top.csv')
]).then(function (files) {
    files[0].forEach(function (d) {
        delete d['']; // Removes unneeded columns that may or may not exist
        delete d['Unnamed: 0'];
        delete d['Unnamed: 0.1'];
    });
    console.log("Candid Data:");
    console.log(files[0]);
    data_candid = files[0];

    files[1].forEach(function (d) {
        delete d['']; // Removes unneeded columns that may or may not exist
        delete d['Unnamed: 0'];
        delete d['Unnamed: 0.1'];
    });
    console.log("990 Data:");
    console.log(files[1]);
    data_990 = files[1];

    allData = data_candid;

    changePage(0);

}).catch(function (error) {
    console.error('Error loading data: ', error);
});

document.getElementById('searchBox').addEventListener('input', function () {
    const query = this.value.toLowerCase();
    filteredData = currentData.filter(d => d.org_name.toLowerCase().includes(query));
    if (filteredData.length <= 0 && query !== '') {
        this.classList.add('no-results');
        this.disabled = true;
        
        setTimeout(() => {
            this.disabled = false;
            this.focus();
        }, 500);
    } else {
        this.classList.remove('no-results');
        this.disabled = false;
    }
    currentPage = 1;
    changePage(0);
});