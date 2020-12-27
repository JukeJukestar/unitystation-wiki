var fs = require("fs");
var path = require("path");
var utils = require("./listerUtils");

// scriptableobject -> prefab -> sprite
// 1) c:\git\unitystation\UnityProject\Assets\Resources\ScriptableObjects\FoodRecipes\
// read
// Name: Meat Donut
//   Ingredients:
//   - requiredAmount: 1
//     ingredientName: raw cutlet
//   - requiredAmount: 1
//     ingredientName: pastry base
//   Output: {fileID: 5602298466666205948, guid: c3aae48c2e0c81140a838e4e5a6f5b2a, type: 3}

// 2 c:\git\unitystation\UnityProject\Assets\Resources\Prefabs\Items\Food\Snacks\
// read donutmeat.meta -> get guid
// read donutmean.prefab -> get the sprite!

// 3 READ THE TEXTURES FROM c:\git\unitystation\UnityProject\Assets\Textures\items\food\
// read the .asset files, get the guid!
// match with png!

// basepath to the unityProject folder
var basePath = "C:/git/unitystation/UnityProject";

// this is where we are reading the craftable recipes from.
// eg: we will find a 'bearburger' recipe
const SCRIPTABLE_FOLDER = "/Assets/Resources/ScriptableObjects/FoodRecipes";

const PREFAB_FOLDER = "/Assets/Resources/Prefabs/Items/Food/";

// this is where we're trying to find the textures
const TEXTURE_FOLDER = "/Assets/Textures/items/food";

/** list of caftables
 * contains a whole lotta
 * {
    name: "",
    ingredients: "",
    prefabId: "",
  };
 * 
 */
let craftables = [];
// pairs a prefabId to an object {nutritionLevel, initialDescription, spriteId, prefabId}
let prefabDictionary = {};
// pairs PREFAB_ID with SPRITE_ID
let spriteIdToImageDictionary = {};

// list of all scriptableObject files
let scriptableFiles = [];
// list of all prefab meta files
let prefabMetaFiles = [];
// list of all texture meta files
let textureFiles = [];

var foldersRead = 0;

const init = () => {
  if (foldersRead !== 3) {
    return;
  }
  // STEP 1. read the craftables from the list of all possible scriptables (some are not craftable!)
  craftables = readRecipes(scriptableFiles);

  // STEP 2. create a list of all the prefab id's and their corresponding description object
  prefabMetaFiles.forEach((fileName) => {
    const prefabData = utils.extractPrefabData(fileName);
    // point to the actual prefab file
    if (prefabData !== null) {
      prefabDictionary[prefabData.prefabId] = prefabData;
    }
  });

  // STEP 3. Create a dictionary for the textureId -> real png file
  textureFiles.forEach((fileName) => {
    const pngMetaData = utils.extractTextureData(fileName);
    spriteIdToImageDictionary[pngMetaData.textureId] = pngMetaData.pngFileName;
  });


  // OUTPUT THE CRAFTABLE RECIPES!
  let finalList = "| Picture | Name | Ingredients | Nutrition Level | Comments |\r\n";
  craftables.forEach((craftable) => {
    let prefabId = craftable.prefabId ;
    if (prefabDictionary[prefabId] && prefabDictionary[prefabId].spriteId) {
      const textureId = prefabDictionary[prefabId].spriteId || "???";
      const pngFilePath = spriteIdToImageDictionary[textureId] || "???";
      const nutritionLevel = prefabDictionary[prefabId].nutritionLevel || "N/A";
      const initialDescription = prefabDictionary[prefabId].initialDescription || "N/A";;

      delete spriteIdToImageDictionary[textureId];
      delete prefabDictionary[prefabId];
      // create the wiki .md table
      let wikiFilePath = "";
      if (pngFilePath) wikiFilePath = pngFilePath.split("\\").pop();
      finalList += `| ![${craftable.name}](${wikiFilePath}) |`;
      finalList += ` ${craftable.name} |`;
      finalList += ` ${craftable.ingredients} |`;
      finalList += ` ${nutritionLevel} |`; // nutritionLevel
      finalList += ` ${initialDescription} |\r\n`; // comments?
    }
  });


  // OUTPUT THE NON CRAFTABLES!
  let nonCraftables = "| Picture | Name | Nutrition Level | Comments |\r\n";
  Object.values(prefabDictionary).forEach((prefabData) => {
    const prefabId = prefabData.prefabId;
    const textureId = prefabDictionary[prefabId].spriteId;
    const pngFilePath = spriteIdToImageDictionary[textureId];
    const nutritionLevel = prefabDictionary[prefabId].nutritionLevel || "N/A";
    const initialDescription = prefabDictionary[prefabId].initialDescription || "N/A";;

    delete spriteIdToImageDictionary[textureId];
    delete prefabDictionary[prefabId];
    // create the wiki .md table
    let wikiFilePath = "";
    if (pngFilePath) wikiFilePath = pngFilePath.split("\\").pop();
    nonCraftables += `| ![${prefabData.name}](${wikiFilePath}) |`;
    nonCraftables += ` ${prefabData.name} |`;
    nonCraftables += ` ${nutritionLevel} |`;
    nonCraftables += ` ${initialDescription} |\r\n`;
  });  



  if (fs.existsSync("orphaned.txt")) fs.unlinkSync("orphaned.txt");
  if (fs.existsSync("recipes.txt")) fs.unlinkSync("recipes.txt");
  if (fs.existsSync("noncraftables.txt")) fs.unlinkSync("noncraftables.txt");

  fs.writeFile(
    "orphaned.txt",
    Object.values(spriteIdToImageDictionary).join(", \r\n"),
    ()=>{}
  );
  fs.writeFile("recipes.txt", finalList, ()=>{});
  fs.writeFile("noncraftables.txt", nonCraftables, ()=>{});  
};

const scriptablePath = basePath + SCRIPTABLE_FOLDER;
const prefabPath = basePath + PREFAB_FOLDER;
const texturePath = basePath + TEXTURE_FOLDER;

utils.walk(scriptablePath, (err, res) => {
  // only the .asset interest us
  scriptableFiles = res.filter(
    (arg) => arg.indexOf(".asset") !== -1 && arg.indexOf(".meta") === -1
  );
  foldersRead++;
  init();
});

utils.walk(prefabPath, (err, res) => {
  prefabMetaFiles = res.filter((arg) => arg.indexOf(".meta") !== -1);
  foldersRead++;
  init();
});

utils.walk(texturePath, (err, res) => {
  textureFiles = res.filter((arg) => arg.indexOf(".png.meta") !== -1);
  foldersRead++;
  init();
});

const readRecipes = (filesList) => {
  const myRecipes = [];
  filesList.map((file) => {
    const newRecipe = utils.extractRecipeFromScriptableObjectFile(file);
    if (newRecipe) myRecipes.push(newRecipe);
  });
  return myRecipes;
};
