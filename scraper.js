const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const app = express();
const bodyParser = require('body-parser');

app.use(bodyParser.json());

let browser; // Déclarer la variable browser en dehors des fonctions pour la rendre accessible globalement
let collectedData = [];

async function startServer() {
  try {
    browser = await puppeteer.launch({ headless: false });
    console.log('Le serveur est lancé sur le port 4000');
    await openFirstPage();
  } catch (error) {
    console.error('Erreur rencontrée lors du démarrage du serveur :', error);
  }
}

async function openFirstPage() {
  try {
    const page = await browser.newPage();
    await page.goto(
      'https://merchants.ubereats.com/manager/payments?restaurantUUID=19b98315-9e91-5ad3-b6a5-5a93b7dabe6b'
    );

    const emailInputSelector = '#PHONE_NUMBER_or_EMAIL_ADDRESS';
    await page.waitForSelector(emailInputSelector);
    await page.type(emailInputSelector, 'khalidaboue1@hotmail.com');

    console.log('Première page ouverte dans le navigateur.');
  } catch (error) {
    console.error(
      "Erreur rencontrée lors de l'ouverture de la première page :",
      error
    );
  }
}

app.get('/api', (req, res) => {
  res.json({ users: ['usero', 'usert', 'userr'] });
});

app.get('/api/test', (req, res) => {
  console.log('daz mn api');
  const data = chargerDonneesDuFichier();
  if (data !== null) {
    const donneesSpecifiques = extraireDonneesSpecifiques(data);

    const merchantFundedFoodDiscounts = donneesSpecifiques.find(
      (item) => item.categoryName === 'MerchantFundedFoodDiscounts'
    );
    const depensedecommande = donneesSpecifiques.find(
      (item) => item.categoryName === 'numerodecommande'
    );

    const chiffreAffaires =
      donneesSpecifiques.find((item) => item.categoryName === 'FoodSubTotal')
        .categoryTotal + FundedFoodDiscounts;

    const depensesPublicitaires = donneesSpecifiques.find(
      (item) => item.categoryName === 'AdSpend'
    ).categoryTotal;
    const orderErrorAdjustmentItem = donneesSpecifiques.find(
      (item) => item.categoryName === 'OrderErrorAdjustmentGlobal'
    );
    const remboursements = orderErrorAdjustmentItem
      ? orderErrorAdjustmentItem.categoryTotal
      : 0;

    const virement = donneesSpecifiques.find(
      (item) => item.categoryName === 'total_payout'
    ).categoryTotal;

    const pourcentageGain =
      ((virement - depensedecommande) * 100) / chiffreAffaires;

    const pourcentagevirement = (virement * 100) / chiffreAffaires;
    const pourcentagepublicitaires = -(
      100 -
      ((chiffreAffaires - depensesPublicitaires) * 100) / chiffreAffaires
    );
    const pourcentageREMBOURSEMENTS = -(
      100 -
      ((chiffreAffaires - remboursements) * 100) / chiffreAffaires
    );
    const pourcentageLIVREURS =
      100 - ((chiffreAffaires - depensedecommande) * 100) / chiffreAffaires;
    const pourcentageUber = -(
      pourcentagevirement +
      pourcentagepublicitaires +
      pourcentageREMBOURSEMENTS -
      100
    );

    console.log('Devis :');
    console.log(`- dépense de commande : ${depensedecommande} €`);
    console.log(`- Chiffre d'affaires : ${chiffreAffaires} €`);
    console.log(`- Dépenses publicitaires : ${depensesPublicitaires} €`);
    console.log(`- remboursement : ${remboursements} €`);
    console.log(`- Virement : ${virement} €`);
    console.log(`- Pourcentage de gain : ${pourcentageGain.toFixed(2)} %`);

    const devis = {
      Devis: {
        Chiffre_d_affaires: chiffreAffaires + ' €',
        Dépenses_publicitaires: depensesPublicitaires + ' €',
        Remboursements: remboursements + ' €',
        Dépenses_publicitaires: depensesPublicitaires + ' €',
        Depensedecommande: depensedecommande + ' €',
        Pourcentage_de_gain: pourcentageGain.toFixed(2),
        Virement: virement + ' €',
        gain: virement - depensedecommande + ' €',
        Pourcentagevirement: pourcentagevirement.toFixed(2),
        Pourcentagepublicitaires: pourcentagepublicitaires.toFixed(2),
        PourcentageREMBOURSEMENTS: pourcentageREMBOURSEMENTS.toFixed(2),
        PourcentageLIVREURS: pourcentageLIVREURS.toFixed(2),
        PourcentageUber: pourcentageUber.toFixed(2),
      },
    };
    res.json(devis);
  } else {
    res
      .status(500)
      .json({ error: 'Impossible de charger les données du fichier.' });
  }
});

app.post('/api/link', async (req, res) => {
  const link = req.body.link;
  console.log('Lien reçu du frontend :', link);

  try {
    await scrapeData(link);
    reinitialiserDonnees();
    saveDataToJson(collectedData);

    res.json({
      success: true,
      message: 'Scraping et sauvegarde terminés avec succès.',
    });
  } catch (error) {
    console.error(
      'Erreur lors du scraping ou de la sauvegarde des données:',
      error
    );
    res.status(500).json({
      success: false,
      error: 'Erreur lors du traitement de votre demande.',
    });
  }
});

app.get('/api/restaurants', (req, res) => {
  try {
    const restaurantFilePath = path.join(__dirname, './data/retaurant.json');
    if (fs.existsSync(restaurantFilePath)) {
      const data = fs.readFileSync(restaurantFilePath, 'utf8');
      const restaurants = JSON.parse(data);
      res.json(restaurants);
    } else {
      res
        .status(404)
        .json({ error: 'Le fichier des restaurants est introuvable.' });
    }
  } catch (error) {
    console.error(
      'Erreur lors de la lecture du fichier JSON des restaurants :',
      error
    );
    res.status(500).json({
      error: 'Erreur lors de la lecture des données des restaurants.',
    });
  }
});

function reinitialiserDonnees() {
  collectedData = [];
}

function extraireDonneesSpecifiques(data) {
  const donneesSpecifiques = [];

  data.forEach((item) => {
    if (
      item.childEarningTaxonomyNodes &&
      item.childEarningTaxonomyNodes.length > 0
    ) {
      item.childEarningTaxonomyNodes.forEach((childItem) => {
        const categoryName = childItem.categoryName.text;
        const categoryTotal = parseFloat(
          childItem.categoryTotal.text.replace('€', '').replace(',', '.')
        );

        if (
          categoryName === 'FoodSubTotal' ||
          categoryName === 'DeliveryFeeGlobal' ||
          categoryName === 'MerchantFundedFoodDiscounts' ||
          categoryName === 'OrderErrorAdjustmentGlobal' ||
          categoryName === 'AdSpend' ||
          categoryName === 'MarketplaceFeeGlobal' ||
          categoryName === 'MISC_ITEM'
        ) {
          donneesSpecifiques.push({
            categoryName: categoryName,
            categoryTotal: categoryTotal,
          });
        }

        const nodeIndex2 = data.find((item) => item.nodeIndex === 2);

        if (nodeIndex2) {
          nodeIndex2.childEarningTaxonomyNodes.forEach((node) => {
            if (node.childEarningTaxonomyNodes.length > 0) {
              node.childEarningTaxonomyNodes.forEach((subNode) => {
                if (subNode.categoryName.text === 'DELIVERY_THIRD_PARTY') {
                  const descriptionText = subNode.description.title.body.text;
                  const regexMatch = descriptionText.match(/\d+/);
                  if (regexMatch) {
                    const numero = parseInt(regexMatch[0]);
                    donneesSpecifiques.push({
                      categoryName: 'numerodecommande',
                      categoryTotal: numero,
                    });
                  }
                }
              });
            }
          });
        }
      });
    }

    if (item.categoryTotal && item.categoryTotal.text) {
      const totalPayout = parseFloat(
        item.categoryTotal.text.replace('€', '').replace(',', '.')
      );
      donneesSpecifiques.push({
        categoryName: 'total_payout',
        categoryTotal: totalPayout,
      });
    }
  });

  saveDataToInfo(donneesSpecifiques);
  return donneesSpecifiques;
}

function chargerDonneesDuFichier() {
  try {
    const contenuFichier = fs.readFileSync('./data/data.json', 'utf-8');
    return JSON.parse(contenuFichier);
  } catch (erreur) {
    console.error('Erreur lors du chargement des données du fichier :', erreur);
    return null;
  }
}

async function scrapeData(link) {
  try {
    console.log('Lancement du navigateur en mode visible pour le débogage...');

    // Ouvrir une nouvelle page dans le même navigateur
    const page = await browser.newPage();

    // Naviguer vers le lien fourni
    await page.goto(link);

    console.log('Nouvelle page ouverte dans le navigateur.');

    // Utiliser collectedData au lieu de data

    page.on('response', async (response) => {
      if (response.url().includes('graphql')) {
        const responseBody = await response.text();
        const json = JSON.parse(responseBody);
        if (json && json.data && json.data['GetEarningsSummaryV2']) {
          for (let i = 0; i <= 4; i++) {
            collectedData.push({
              nodeIndex: i,
              childEarningTaxonomyNodes:
                json.data['GetEarningsSummaryV2']['earningsTaxonomy'][
                  'earningTaxonomyNodes'
                ][i]['childEarningTaxonomyNodes'],
            });
            console.log(collectedData[i]);
          }

          if (
            json.data &&
            json.data['GetEarningsSummaryV2'] &&
            json.data['GetEarningsSummaryV2']['earningsTaxonomy'] &&
            json.data['GetEarningsSummaryV2']['earningsTaxonomy'][
              'earningTaxonomyNodes'
            ] &&
            json.data['GetEarningsSummaryV2']['earningsTaxonomy'][
              'earningTaxonomyNodes'
            ][5]
          ) {
            // Si l'objet existe, ajouter categoryTotal à collectedData
            collectedData.push({
              categoryTotal:
                json.data['GetEarningsSummaryV2']['earningsTaxonomy'][
                  'earningTaxonomyNodes'
                ][5]['categoryTotal'],
            });
          } else {
            collectedData.push({
              categoryTotal:
                json.data['GetEarningsSummaryV2']['earningsTaxonomy'][
                  'earningTaxonomyNodes'
                ][4]['categoryTotal'],
            });
          }
          /*
          if (
            json.data &&
            json.data['GetEarningsSummaryV2'] &&
            json.data['GetEarningsSummaryV2']['valueAdditionWidgetInfo'] &&
            json.data['GetEarningsSummaryV2']['valueAdditionWidgetInfo'][
              'widgets'
            ]
          ) {
            // Si l'objet existe, ajouter le tableau widgets à collectedData
            collectedData.push({
              widgets:
                json.data['GetEarningsSummaryV2']['valueAdditionWidgetInfo'][
                  'widgets'
                ],
            });
          }
          */
        }

        fs.unlinkSync('./data/data.json');

        console.log(collectedData), saveDataToJson(collectedData);
      }
    });

    // Écouter les réponses
  } catch (error) {
    console.error('Erreur rencontrée lors du scraping :', error);
  }
}

function saveDataToJson(data) {
  const jsonData = JSON.stringify(data);
  const directoryPath = path.join(__dirname, 'data');

  // Vérifier si le répertoire existe, sinon le créer
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const filePath = path.join(directoryPath, 'data.json'); // Chemin vers le fichier JSON
  fs.writeFileSync(filePath, jsonData, { flag: 'w' });
  return 'Données sauvegardées avec succès.';
}

function saveDataToInfo(data) {
  if (fs.existsSync('./data/info.json')) {
    fs.unlinkSync('./data/info.json');
    console.log('Fichier info.json supprimé');
  }
  const jsonData = JSON.stringify(data);
  const directoryPath = path.join(__dirname, 'data');

  // Vérifier si le répertoire existe, sinon le créer
  if (!fs.existsSync(directoryPath)) {
    fs.mkdirSync(directoryPath, { recursive: true });
  }

  const filePath = path.join(directoryPath, 'info.json'); // Chemin vers le fichier JSON
  fs.writeFileSync(filePath, jsonData, { flag: 'w' });
  console.log('daz mn savedata');
  console.log('Données enregistrées dans le fichier data.json');
}
startServer();
