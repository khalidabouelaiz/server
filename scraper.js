const express = require('express');
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express(); // Déclarer express une seule fois

const bodyParser = require('body-parser');
app.use(bodyParser.json());
let collectedData = [];
// Endpoint pour le premier serveur
app.get('/api', (req, res) => {
  res.json({ users: ['usero', 'usert', 'userr'] });
});
async function startServer() {
  browser = await puppeteer.launch({ headless: false });
  await openFirstPage();
}
async function openFirstPage() {
  try {
    // Lancer le navigateur en mode visible
    const page = await browser.newPage();

    // Naviguer vers la première page après le lancement du serveur
    await page.goto(
      'https://merchants.ubereats.com/manager/payments?restaurantUUID=19b98315-9e91-5ad3-b6a5-5a93b7dabe6b'
    );

    const emailInputSelector = '#PHONE_NUMBER_or_EMAIL_ADDRESS';

    // Attendre que l'élément input soit chargé
    await page.waitForSelector(emailInputSelector);

    // Écrire l'email dans l'élément input
    await page.type(emailInputSelector, 'khalidaboue1@hotmail.com');

    // Continuer avec le reste de votre code pour la première page

    console.log('Première page ouverte dans le navigateur.');
  } catch (error) {
    console.error(
      "Erreur rencontrée lors de l'ouverture de la première page :",
      error
    );
  }
}

// Endpoint pour le deuxième serveur
app.get('/api/test', (req, res) => {
  console.log('daz mn api');
  const data = chargerDonneesDuFichier();
  if (data !== null) {
    const donneesSpecifiques = extraireDonneesSpecifiques(data);

    const merchantFundedFoodDiscounts = donneesSpecifiques.find(
      (item) => item.categoryName === 'MerchantFundedFoodDiscounts'
    );
    if (merchantFundedFoodDiscounts) {
      FundedFoodDiscounts = merchantFundedFoodDiscounts.categoryTotal;
    } else {
      FundedFoodDiscounts = 0;
    }
    const nombredecommande = donneesSpecifiques.find(
      (item) => item.categoryName === 'numerodecommande'
    );
    if (nombredecommande) {
      depensedecommande = nombredecommande.categoryTotal * 4;
    } else {
      depensedecommande = 0;
    }
    const chiffreAffaires =
      donneesSpecifiques.find((item) => item.categoryName === 'FoodSubTotal')
        .categoryTotal + FundedFoodDiscounts;

    const depensesPublicitaires = donneesSpecifiques.find(
      (item) => item.categoryName === 'AdSpend'
    ).categoryTotal;
    const orderErrorAdjustmentItem = donneesSpecifiques.find(
      (item) => item.categoryName === 'OrderErrorAdjustmentGlobal'
    );
    if (orderErrorAdjustmentItem) {
      remboursements = orderErrorAdjustmentItem.categoryTotal;
    } else {
      remboursements = 0;
    }

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
    console.log(`- depense de commande  : ${depensedecommande} €`);
    console.log(`- Chiffre d'affaires : ${chiffreAffaires} €`);
    console.log(`- Dépenses publicitaires : ${depensesPublicitaires} €`);
    console.log(`- rembourssement : ${remboursements} €`);
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
    res.json(devis); // Renvoyer les données du devis en réponse à la requête
  } else {
    res
      .status(500)
      .json({ error: 'Impossible de charger les données du fichier.' });
  }
});
// Endpoint pour le troisième serveur
app.post('/api/link', async (req, res) => {
  const link = req.body.link;
  console.log('Lien reçu du frontend :', link);

  try {
    // Puisque `scrapeData` est une fonction asynchrone, on utilise `await` pour attendre sa complétion.
    await scrapeData(link);

    // Réinitialiser les données si nécessaire.
    reinitialiserDonnees();

    // Sauvegarder les données
    saveDataToJson(collectedData);

    // Envoyer une réponse au client une fois le scraping et la sauvegarde terminés.
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

app.listen(4000, () => {
  console.log('Le serveur est lancé sur le port 4000');
});
app.get('/api/restaurants', (req, res) => {
  try {
    const restaurantFilePath = path.join(__dirname, './data/retaurant.json');
    // Vérifier si le fichier existe avant de le lire
    if (fs.existsSync(restaurantFilePath)) {
      const data = fs.readFileSync(restaurantFilePath, 'utf8');
      const restaurants = JSON.parse(data);
      res.json(restaurants);
    } else {
      // Si le fichier n'existe pas, renvoyer une réponse avec le statut 404
      res
        .status(404)
        .json({ error: 'Le fichier des restaurants est introuvable.' });
    }
  } catch (error) {
    console.error(
      'Erreur lors de la lecture du fichier JSON des restaurants :',
      error
    );
    // Renvoyer une réponse avec le statut 500 en cas d'erreur interne du serveur
    res.status(500).json({
      error: 'Erreur lors de la lecture des données des restaurants.',
    });
  }
});

function reinitialiserDonnees() {
  collectedData = [];
  donneesSpecifiques = [];
}

function extraireDonneesSpecifiques(data) {
  const donneesSpecifiques = [];

  data.forEach((item) => {
    console.log('daz mn extraire');

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
          categoryName === 'MISC_ITEM' ||
          (item.categoryTotal && item.categoryTotal.text)
        ) {
          donneesSpecifiques.push({
            categoryName: categoryName,
            categoryTotal: categoryTotal,
          });
        }
        console.log('Données reçues :', data);

        // Recherche du nœud avec nodeIndex égal à 2
        const nodeIndex2 = data.find((item) => item.nodeIndex === 2);
        console.log('Nœud avec nodeIndex 2 :', nodeIndex2);

        if (nodeIndex2) {
          nodeIndex2.childEarningTaxonomyNodes.forEach((node) => {
            // Afficher les informations de chaque nœud

            // Vérifier s'il y a des sous-nœuds
            if (node.childEarningTaxonomyNodes.length > 0) {
              console.log('C  e nœud contient des sous-nœuds : ');
              // Boucle à travers chaque sous-nœud
              node.childEarningTaxonomyNodes.forEach((subNode) => {
                if (subNode.categoryName.text === 'DELIVERY_THIRD_PARTY') {
                  console.log(' - Catégorie de revenu:', subNode.categoryName);

                  console.log(
                    '   Description:',
                    subNode.description.title.body.text
                  );
                  const descriptionText = subNode.description.title.body.text;
                  const regexMatch = descriptionText.match(/\d+/); // Utilisation d'une expression régulière pour récupérer le nombre
                  if (regexMatch) {
                    const numero = parseInt(regexMatch[0]); // Convertir le nombre en entier
                    console.log('   Numéro:', numero);
                    donneesSpecifiques.push({
                      categoryName: 'numerodecommande',
                      categoryTotal: numero,
                    });
                  } else {
                    console.log('   Aucun numéro trouvé dans la description.');
                  }
                }
                // Vous pouvez continuer à accéder à d'autres propriétés au besoin
              });
            } else {
              console.log('Ce nœud ne contient pas de sous-nœuds.');
            }
          });
        } else {
          console.log("Aucun nœud trouvé avec l'index 2.");
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

    /* const commandesWidget = data[2];
    if (
      commandesWidget &&
      commandesWidget.comparator &&
      commandesWidget.comparator.currentValue
    ) {
      const commandesValue = parseInt(
        commandesWidget.comparator.currentValue.text
      );
      donneesSpecifiques.push({
        categoryName: 'commandes',
        categoryTotal: commandesValue,
      });
      console.log('tesssssssssssssssttttt' + commandesValue);
    }*/
  });
  console.log(donneesSpecifiques);
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
