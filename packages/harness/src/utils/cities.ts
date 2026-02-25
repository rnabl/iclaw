/**
 * US Cities Database
 * 
 * Comprehensive list of major US markets with 100K+ population.
 * Used for location normalization and city search.
 */

export interface City {
  city: string;
  state: string;
  stateCode: string;
  population: number;
  metro?: string; // Metropolitan area name if applicable
}

// Major US cities with 100K+ population
export const US_CITIES: City[] = [
  // Top metros first for better autocomplete
  { city: "New York", state: "New York", stateCode: "NY", population: 8336817, metro: "New York-Newark" },
  { city: "Los Angeles", state: "California", stateCode: "CA", population: 3979576, metro: "Los Angeles" },
  { city: "Chicago", state: "Illinois", stateCode: "IL", population: 2693976, metro: "Chicago" },
  { city: "Houston", state: "Texas", stateCode: "TX", population: 2320268, metro: "Houston" },
  { city: "Phoenix", state: "Arizona", stateCode: "AZ", population: 1680992, metro: "Phoenix" },
  { city: "Philadelphia", state: "Pennsylvania", stateCode: "PA", population: 1584064, metro: "Philadelphia" },
  { city: "San Antonio", state: "Texas", stateCode: "TX", population: 1547253 },
  { city: "San Diego", state: "California", stateCode: "CA", population: 1423851, metro: "San Diego" },
  { city: "Dallas", state: "Texas", stateCode: "TX", population: 1343573, metro: "Dallas-Fort Worth" },
  { city: "San Jose", state: "California", stateCode: "CA", population: 1013240, metro: "San Jose" },
  { city: "Austin", state: "Texas", stateCode: "TX", population: 978908, metro: "Austin" },
  { city: "Jacksonville", state: "Florida", stateCode: "FL", population: 949611 },
  { city: "Fort Worth", state: "Texas", stateCode: "TX", population: 918915, metro: "Dallas-Fort Worth" },
  { city: "Columbus", state: "Ohio", stateCode: "OH", population: 898553, metro: "Columbus" },
  { city: "Charlotte", state: "North Carolina", stateCode: "NC", population: 885708, metro: "Charlotte" },
  { city: "Indianapolis", state: "Indiana", stateCode: "IN", population: 876384, metro: "Indianapolis" },
  { city: "San Francisco", state: "California", stateCode: "CA", population: 873965, metro: "San Francisco-Oakland" },
  
  // Alabama
  { city: "Birmingham", state: "Alabama", stateCode: "AL", population: 200733 },
  { city: "Montgomery", state: "Alabama", stateCode: "AL", population: 200603 },
  { city: "Huntsville", state: "Alabama", stateCode: "AL", population: 215006 },
  { city: "Mobile", state: "Alabama", stateCode: "AL", population: 187041 },
  
  // Alaska
  { city: "Anchorage", state: "Alaska", stateCode: "AK", population: 291247 },
  
  // Arizona
  { city: "Tucson", state: "Arizona", stateCode: "AZ", population: 548073 },
  { city: "Mesa", state: "Arizona", stateCode: "AZ", population: 504258, metro: "Phoenix" },
  { city: "Chandler", state: "Arizona", stateCode: "AZ", population: 275987, metro: "Phoenix" },
  { city: "Scottsdale", state: "Arizona", stateCode: "AZ", population: 258069, metro: "Phoenix" },
  { city: "Glendale", state: "Arizona", stateCode: "AZ", population: 250290, metro: "Phoenix" },
  { city: "Gilbert", state: "Arizona", stateCode: "AZ", population: 267918, metro: "Phoenix" },
  { city: "Tempe", state: "Arizona", stateCode: "AZ", population: 195805, metro: "Phoenix" },
  { city: "Peoria", state: "Arizona", stateCode: "AZ", population: 190985, metro: "Phoenix" },
  
  // Arkansas
  { city: "Little Rock", state: "Arkansas", stateCode: "AR", population: 202591 },
  
  // California
  { city: "Fresno", state: "California", stateCode: "CA", population: 542107 },
  { city: "Sacramento", state: "California", stateCode: "CA", population: 524943, metro: "Sacramento" },
  { city: "Long Beach", state: "California", stateCode: "CA", population: 466742, metro: "Los Angeles" },
  { city: "Oakland", state: "California", stateCode: "CA", population: 433031, metro: "San Francisco-Oakland" },
  { city: "Bakersfield", state: "California", stateCode: "CA", population: 403455 },
  { city: "Anaheim", state: "California", stateCode: "CA", population: 351043, metro: "Los Angeles" },
  { city: "Santa Ana", state: "California", stateCode: "CA", population: 310227, metro: "Los Angeles" },
  { city: "Riverside", state: "California", stateCode: "CA", population: 331360 },
  { city: "Stockton", state: "California", stateCode: "CA", population: 320804 },
  { city: "Irvine", state: "California", stateCode: "CA", population: 307670, metro: "Los Angeles" },
  { city: "Chula Vista", state: "California", stateCode: "CA", population: 275487, metro: "San Diego" },
  { city: "Fremont", state: "California", stateCode: "CA", population: 230504, metro: "San Francisco-Oakland" },
  { city: "San Bernardino", state: "California", stateCode: "CA", population: 222101 },
  { city: "Modesto", state: "California", stateCode: "CA", population: 218464 },
  { city: "Fontana", state: "California", stateCode: "CA", population: 214547, metro: "Los Angeles" },
  { city: "Oxnard", state: "California", stateCode: "CA", population: 202063 },
  { city: "Moreno Valley", state: "California", stateCode: "CA", population: 208634 },
  { city: "Huntington Beach", state: "California", stateCode: "CA", population: 198711, metro: "Los Angeles" },
  { city: "Glendale", state: "California", stateCode: "CA", population: 196543, metro: "Los Angeles" },
  { city: "Santa Clarita", state: "California", stateCode: "CA", population: 228673, metro: "Los Angeles" },
  { city: "Garden Grove", state: "California", stateCode: "CA", population: 172800, metro: "Los Angeles" },
  { city: "Oceanside", state: "California", stateCode: "CA", population: 174068, metro: "San Diego" },
  { city: "Rancho Cucamonga", state: "California", stateCode: "CA", population: 177603, metro: "Los Angeles" },
  { city: "Ontario", state: "California", stateCode: "CA", population: 175265, metro: "Los Angeles" },
  { city: "Elk Grove", state: "California", stateCode: "CA", population: 176124, metro: "Sacramento" },
  { city: "Corona", state: "California", stateCode: "CA", population: 169868, metro: "Los Angeles" },
  { city: "Lancaster", state: "California", stateCode: "CA", population: 173516, metro: "Los Angeles" },
  { city: "Palmdale", state: "California", stateCode: "CA", population: 169450, metro: "Los Angeles" },
  { city: "Salinas", state: "California", stateCode: "CA", population: 163542 },
  { city: "Hayward", state: "California", stateCode: "CA", population: 162954, metro: "San Francisco-Oakland" },
  { city: "Pomona", state: "California", stateCode: "CA", population: 151696, metro: "Los Angeles" },
  { city: "Sunnyvale", state: "California", stateCode: "CA", population: 155805, metro: "San Jose" },
  { city: "Escondido", state: "California", stateCode: "CA", population: 151038, metro: "San Diego" },
  { city: "Pasadena", state: "California", stateCode: "CA", population: 138699, metro: "Los Angeles" },
  { city: "Torrance", state: "California", stateCode: "CA", population: 147067, metro: "Los Angeles" },
  { city: "Orange", state: "California", stateCode: "CA", population: 139812, metro: "Los Angeles" },
  { city: "Fullerton", state: "California", stateCode: "CA", population: 143617, metro: "Los Angeles" },
  { city: "Roseville", state: "California", stateCode: "CA", population: 147773, metro: "Sacramento" },
  { city: "Visalia", state: "California", stateCode: "CA", population: 141384 },
  { city: "Santa Rosa", state: "California", stateCode: "CA", population: 178127 },
  { city: "Thousand Oaks", state: "California", stateCode: "CA", population: 126683, metro: "Los Angeles" },
  { city: "Simi Valley", state: "California", stateCode: "CA", population: 126356, metro: "Los Angeles" },
  { city: "Concord", state: "California", stateCode: "CA", population: 129295, metro: "San Francisco-Oakland" },
  { city: "Victorville", state: "California", stateCode: "CA", population: 134810 },
  { city: "Vallejo", state: "California", stateCode: "CA", population: 121275, metro: "San Francisco-Oakland" },
  { city: "Berkeley", state: "California", stateCode: "CA", population: 124321, metro: "San Francisco-Oakland" },
  { city: "El Monte", state: "California", stateCode: "CA", population: 115517, metro: "Los Angeles" },
  { city: "Downey", state: "California", stateCode: "CA", population: 111263, metro: "Los Angeles" },
  { city: "Costa Mesa", state: "California", stateCode: "CA", population: 111918, metro: "Los Angeles" },
  { city: "Inglewood", state: "California", stateCode: "CA", population: 107762, metro: "Los Angeles" },
  { city: "Carlsbad", state: "California", stateCode: "CA", population: 114746, metro: "San Diego" },
  { city: "San Buenaventura", state: "California", stateCode: "CA", population: 110763 },
  { city: "Fairfield", state: "California", stateCode: "CA", population: 119881, metro: "San Francisco-Oakland" },
  { city: "West Covina", state: "California", stateCode: "CA", population: 106098, metro: "Los Angeles" },
  { city: "Murrieta", state: "California", stateCode: "CA", population: 116174 },
  { city: "Richmond", state: "California", stateCode: "CA", population: 116448, metro: "San Francisco-Oakland" },
  { city: "Norwalk", state: "California", stateCode: "CA", population: 102773, metro: "Los Angeles" },
  { city: "Santa Clara", state: "California", stateCode: "CA", population: 127134, metro: "San Jose" },
  { city: "Daly City", state: "California", stateCode: "CA", population: 104901, metro: "San Francisco-Oakland" },
  
  // Colorado
  { city: "Denver", state: "Colorado", stateCode: "CO", population: 715522, metro: "Denver" },
  { city: "Colorado Springs", state: "Colorado", stateCode: "CO", population: 478961 },
  { city: "Aurora", state: "Colorado", stateCode: "CO", population: 386261, metro: "Denver" },
  { city: "Fort Collins", state: "Colorado", stateCode: "CO", population: 169810 },
  { city: "Lakewood", state: "Colorado", stateCode: "CO", population: 155984, metro: "Denver" },
  { city: "Thornton", state: "Colorado", stateCode: "CO", population: 141867, metro: "Denver" },
  { city: "Arvada", state: "Colorado", stateCode: "CO", population: 124402, metro: "Denver" },
  { city: "Westminster", state: "Colorado", stateCode: "CO", population: 113166, metro: "Denver" },
  { city: "Pueblo", state: "Colorado", stateCode: "CO", population: 111876 },
  { city: "Centennial", state: "Colorado", stateCode: "CO", population: 108418, metro: "Denver" },
  { city: "Boulder", state: "Colorado", stateCode: "CO", population: 105673, metro: "Boulder" },
  { city: "Greeley", state: "Colorado", stateCode: "CO", population: 108649 },
  
  // Connecticut
  { city: "Bridgeport", state: "Connecticut", stateCode: "CT", population: 148654 },
  { city: "New Haven", state: "Connecticut", stateCode: "CT", population: 134023 },
  { city: "Hartford", state: "Connecticut", stateCode: "CT", population: 121054 },
  { city: "Stamford", state: "Connecticut", stateCode: "CT", population: 135470 },
  { city: "Waterbury", state: "Connecticut", stateCode: "CT", population: 114403 },
  
  // Florida
  { city: "Miami", state: "Florida", stateCode: "FL", population: 442241, metro: "Miami" },
  { city: "Tampa", state: "Florida", stateCode: "FL", population: 384959, metro: "Tampa" },
  { city: "Orlando", state: "Florida", stateCode: "FL", population: 307573, metro: "Orlando" },
  { city: "St. Petersburg", state: "Florida", stateCode: "FL", population: 258308, metro: "Tampa" },
  { city: "Hialeah", state: "Florida", stateCode: "FL", population: 223109, metro: "Miami" },
  { city: "Tallahassee", state: "Florida", stateCode: "FL", population: 196169 },
  { city: "Fort Lauderdale", state: "Florida", stateCode: "FL", population: 182760, metro: "Miami" },
  { city: "Port St. Lucie", state: "Florida", stateCode: "FL", population: 201846 },
  { city: "Cape Coral", state: "Florida", stateCode: "FL", population: 194016 },
  { city: "Pembroke Pines", state: "Florida", stateCode: "FL", population: 171178, metro: "Miami" },
  { city: "Hollywood", state: "Florida", stateCode: "FL", population: 153067, metro: "Miami" },
  { city: "Miramar", state: "Florida", stateCode: "FL", population: 139823, metro: "Miami" },
  { city: "Gainesville", state: "Florida", stateCode: "FL", population: 134554 },
  { city: "Coral Springs", state: "Florida", stateCode: "FL", population: 133759, metro: "Miami" },
  { city: "Miami Gardens", state: "Florida", stateCode: "FL", population: 110754, metro: "Miami" },
  { city: "Clearwater", state: "Florida", stateCode: "FL", population: 117292, metro: "Tampa" },
  { city: "Palm Bay", state: "Florida", stateCode: "FL", population: 119760 },
  { city: "Pompano Beach", state: "Florida", stateCode: "FL", population: 112046, metro: "Miami" },
  { city: "West Palm Beach", state: "Florida", stateCode: "FL", population: 111955, metro: "Miami" },
  
  // Georgia
  { city: "Atlanta", state: "Georgia", stateCode: "GA", population: 498715, metro: "Atlanta" },
  { city: "Columbus", state: "Georgia", stateCode: "GA", population: 206922 },
  { city: "Augusta", state: "Georgia", stateCode: "GA", population: 202081 },
  { city: "Macon", state: "Georgia", stateCode: "GA", population: 157346 },
  { city: "Savannah", state: "Georgia", stateCode: "GA", population: 147780 },
  { city: "Athens", state: "Georgia", stateCode: "GA", population: 127064 },
  { city: "Sandy Springs", state: "Georgia", stateCode: "GA", population: 108080, metro: "Atlanta" },
  
  // Hawaii
  { city: "Honolulu", state: "Hawaii", stateCode: "HI", population: 350964 },
  
  // Idaho
  { city: "Boise", state: "Idaho", stateCode: "ID", population: 235684 },
  { city: "Meridian", state: "Idaho", stateCode: "ID", population: 117635 },
  { city: "Nampa", state: "Idaho", stateCode: "ID", population: 100200 },
  
  // Illinois
  { city: "Aurora", state: "Illinois", stateCode: "IL", population: 180542, metro: "Chicago" },
  { city: "Naperville", state: "Illinois", stateCode: "IL", population: 149936, metro: "Chicago" },
  { city: "Joliet", state: "Illinois", stateCode: "IL", population: 150362, metro: "Chicago" },
  { city: "Rockford", state: "Illinois", stateCode: "IL", population: 147051 },
  { city: "Springfield", state: "Illinois", stateCode: "IL", population: 114394 },
  { city: "Elgin", state: "Illinois", stateCode: "IL", population: 114797, metro: "Chicago" },
  { city: "Peoria", state: "Illinois", stateCode: "IL", population: 111388 },
  
  // Indiana
  { city: "Fort Wayne", state: "Indiana", stateCode: "IN", population: 270402 },
  { city: "Evansville", state: "Indiana", stateCode: "IN", population: 117298 },
  { city: "South Bend", state: "Indiana", stateCode: "IN", population: 103395 },
  
  // Iowa
  { city: "Des Moines", state: "Iowa", stateCode: "IA", population: 214133 },
  { city: "Cedar Rapids", state: "Iowa", stateCode: "IA", population: 137710 },
  { city: "Davenport", state: "Iowa", stateCode: "IA", population: 101724 },
  
  // Kansas
  { city: "Wichita", state: "Kansas", stateCode: "KS", population: 389938 },
  { city: "Overland Park", state: "Kansas", stateCode: "KS", population: 197238, metro: "Kansas City" },
  { city: "Kansas City", state: "Kansas", stateCode: "KS", population: 152960, metro: "Kansas City" },
  { city: "Olathe", state: "Kansas", stateCode: "KS", population: 140545, metro: "Kansas City" },
  { city: "Topeka", state: "Kansas", stateCode: "KS", population: 126587 },
  
  // Kentucky
  { city: "Louisville", state: "Kentucky", stateCode: "KY", population: 633045 },
  { city: "Lexington", state: "Kentucky", stateCode: "KY", population: 322570 },
  
  // Louisiana
  { city: "New Orleans", state: "Louisiana", stateCode: "LA", population: 383997 },
  { city: "Baton Rouge", state: "Louisiana", stateCode: "LA", population: 227470 },
  { city: "Shreveport", state: "Louisiana", stateCode: "LA", population: 187593 },
  { city: "Lafayette", state: "Louisiana", stateCode: "LA", population: 121374 },
  
  // Maryland
  { city: "Baltimore", state: "Maryland", stateCode: "MD", population: 585708, metro: "Baltimore" },
  
  // Massachusetts
  { city: "Boston", state: "Massachusetts", stateCode: "MA", population: 692600, metro: "Boston" },
  { city: "Worcester", state: "Massachusetts", stateCode: "MA", population: 206518 },
  { city: "Springfield", state: "Massachusetts", stateCode: "MA", population: 155929 },
  { city: "Cambridge", state: "Massachusetts", stateCode: "MA", population: 118403, metro: "Boston" },
  { city: "Lowell", state: "Massachusetts", stateCode: "MA", population: 115554, metro: "Boston" },
  
  // Michigan
  { city: "Detroit", state: "Michigan", stateCode: "MI", population: 639111, metro: "Detroit" },
  { city: "Grand Rapids", state: "Michigan", stateCode: "MI", population: 198917 },
  { city: "Warren", state: "Michigan", stateCode: "MI", population: 139387, metro: "Detroit" },
  { city: "Sterling Heights", state: "Michigan", stateCode: "MI", population: 134346, metro: "Detroit" },
  { city: "Ann Arbor", state: "Michigan", stateCode: "MI", population: 123851, metro: "Detroit" },
  { city: "Lansing", state: "Michigan", stateCode: "MI", population: 112644 },
  
  // Minnesota
  { city: "Minneapolis", state: "Minnesota", stateCode: "MN", population: 429954, metro: "Minneapolis-St. Paul" },
  { city: "St. Paul", state: "Minnesota", stateCode: "MN", population: 311527, metro: "Minneapolis-St. Paul" },
  { city: "Rochester", state: "Minnesota", stateCode: "MN", population: 121395 },
  
  // Mississippi
  { city: "Jackson", state: "Mississippi", stateCode: "MS", population: 153701 },
  
  // Missouri
  { city: "Kansas City", state: "Missouri", stateCode: "MO", population: 508090, metro: "Kansas City" },
  { city: "St. Louis", state: "Missouri", stateCode: "MO", population: 301578, metro: "St. Louis" },
  { city: "Springfield", state: "Missouri", stateCode: "MO", population: 169176 },
  { city: "Columbia", state: "Missouri", stateCode: "MO", population: 126254 },
  { city: "Independence", state: "Missouri", stateCode: "MO", population: 123011, metro: "Kansas City" },
  
  // Nebraska
  { city: "Omaha", state: "Nebraska", stateCode: "NE", population: 486051 },
  { city: "Lincoln", state: "Nebraska", stateCode: "NE", population: 289102 },
  
  // Nevada
  { city: "Las Vegas", state: "Nevada", stateCode: "NV", population: 641903, metro: "Las Vegas" },
  { city: "Henderson", state: "Nevada", stateCode: "NV", population: 317610, metro: "Las Vegas" },
  { city: "Reno", state: "Nevada", stateCode: "NV", population: 264165 },
  { city: "North Las Vegas", state: "Nevada", stateCode: "NV", population: 251974, metro: "Las Vegas" },
  
  // New Jersey
  { city: "Newark", state: "New Jersey", stateCode: "NJ", population: 311549, metro: "New York-Newark" },
  { city: "Jersey City", state: "New Jersey", stateCode: "NJ", population: 292449, metro: "New York-Newark" },
  { city: "Paterson", state: "New Jersey", stateCode: "NJ", population: 159732, metro: "New York-Newark" },
  { city: "Elizabeth", state: "New Jersey", stateCode: "NJ", population: 137298, metro: "New York-Newark" },
  
  // New Mexico
  { city: "Albuquerque", state: "New Mexico", stateCode: "NM", population: 564559 },
  { city: "Las Cruces", state: "New Mexico", stateCode: "NM", population: 111385 },
  
  // New York
  { city: "Buffalo", state: "New York", stateCode: "NY", population: 278349 },
  { city: "Rochester", state: "New York", stateCode: "NY", population: 211328 },
  { city: "Yonkers", state: "New York", stateCode: "NY", population: 211569, metro: "New York-Newark" },
  { city: "Syracuse", state: "New York", stateCode: "NY", population: 148620 },
  
  // North Carolina
  { city: "Raleigh", state: "North Carolina", stateCode: "NC", population: 474069, metro: "Raleigh" },
  { city: "Greensboro", state: "North Carolina", stateCode: "NC", population: 296710 },
  { city: "Durham", state: "North Carolina", stateCode: "NC", population: 283506, metro: "Raleigh" },
  { city: "Winston-Salem", state: "North Carolina", stateCode: "NC", population: 247945 },
  { city: "Fayetteville", state: "North Carolina", stateCode: "NC", population: 208501 },
  { city: "Cary", state: "North Carolina", stateCode: "NC", population: 174721, metro: "Raleigh" },
  { city: "Wilmington", state: "North Carolina", stateCode: "NC", population: 123744 },
  { city: "High Point", state: "North Carolina", stateCode: "NC", population: 114059 },
  
  // Ohio
  { city: "Cleveland", state: "Ohio", stateCode: "OH", population: 372624, metro: "Cleveland" },
  { city: "Cincinnati", state: "Ohio", stateCode: "OH", population: 309317, metro: "Cincinnati" },
  { city: "Toledo", state: "Ohio", stateCode: "OH", population: 270871 },
  { city: "Akron", state: "Ohio", stateCode: "OH", population: 197597, metro: "Cleveland" },
  { city: "Dayton", state: "Ohio", stateCode: "OH", population: 140407 },
  
  // Oklahoma
  { city: "Oklahoma City", state: "Oklahoma", stateCode: "OK", population: 687725, metro: "Oklahoma City" },
  { city: "Tulsa", state: "Oklahoma", stateCode: "OK", population: 413066 },
  { city: "Norman", state: "Oklahoma", stateCode: "OK", population: 128026, metro: "Oklahoma City" },
  { city: "Broken Arrow", state: "Oklahoma", stateCode: "OK", population: 113540, metro: "Tulsa" },
  
  // Oregon
  { city: "Portland", state: "Oregon", stateCode: "OR", population: 652503, metro: "Portland" },
  { city: "Eugene", state: "Oregon", stateCode: "OR", population: 176654 },
  { city: "Salem", state: "Oregon", stateCode: "OR", population: 177723 },
  { city: "Gresham", state: "Oregon", stateCode: "OR", population: 114247, metro: "Portland" },
  { city: "Hillsboro", state: "Oregon", stateCode: "OR", population: 106447, metro: "Portland" },
  
  // Pennsylvania
  { city: "Pittsburgh", state: "Pennsylvania", stateCode: "PA", population: 302971, metro: "Pittsburgh" },
  { city: "Allentown", state: "Pennsylvania", stateCode: "PA", population: 125845 },
  
  // South Carolina
  { city: "Charleston", state: "South Carolina", stateCode: "SC", population: 150227 },
  { city: "Columbia", state: "South Carolina", stateCode: "SC", population: 136632 },
  { city: "North Charleston", state: "South Carolina", stateCode: "SC", population: 114852 },
  
  // Tennessee
  { city: "Nashville", state: "Tennessee", stateCode: "TN", population: 689447, metro: "Nashville" },
  { city: "Memphis", state: "Tennessee", stateCode: "TN", population: 633104 },
  { city: "Knoxville", state: "Tennessee", stateCode: "TN", population: 190740 },
  { city: "Chattanooga", state: "Tennessee", stateCode: "TN", population: 181099 },
  { city: "Clarksville", state: "Tennessee", stateCode: "TN", population: 166722 },
  { city: "Murfreesboro", state: "Tennessee", stateCode: "TN", population: 152769, metro: "Nashville" },
  
  // Texas (33 cities over 100K)
  { city: "El Paso", state: "Texas", stateCode: "TX", population: 678815 },
  { city: "Corpus Christi", state: "Texas", stateCode: "TX", population: 326554 },
  { city: "Plano", state: "Texas", stateCode: "TX", population: 285494, metro: "Dallas-Fort Worth" },
  { city: "Laredo", state: "Texas", stateCode: "TX", population: 262491 },
  { city: "Lubbock", state: "Texas", stateCode: "TX", population: 258862 },
  { city: "Irving", state: "Texas", stateCode: "TX", population: 256684, metro: "Dallas-Fort Worth" },
  { city: "Garland", state: "Texas", stateCode: "TX", population: 239928, metro: "Dallas-Fort Worth" },
  { city: "Frisco", state: "Texas", stateCode: "TX", population: 200509, metro: "Dallas-Fort Worth" },
  { city: "McKinney", state: "Texas", stateCode: "TX", population: 199177, metro: "Dallas-Fort Worth" },
  { city: "Amarillo", state: "Texas", stateCode: "TX", population: 200393 },
  { city: "Grand Prairie", state: "Texas", stateCode: "TX", population: 196100, metro: "Dallas-Fort Worth" },
  { city: "Brownsville", state: "Texas", stateCode: "TX", population: 186738 },
  { city: "Pasadena", state: "Texas", stateCode: "TX", population: 151950, metro: "Houston" },
  { city: "Killeen", state: "Texas", stateCode: "TX", population: 153095 },
  { city: "Mesquite", state: "Texas", stateCode: "TX", population: 150108, metro: "Dallas-Fort Worth" },
  { city: "McAllen", state: "Texas", stateCode: "TX", population: 142696 },
  { city: "Waco", state: "Texas", stateCode: "TX", population: 139236 },
  { city: "Denton", state: "Texas", stateCode: "TX", population: 148338, metro: "Dallas-Fort Worth" },
  { city: "Carrollton", state: "Texas", stateCode: "TX", population: 139248, metro: "Dallas-Fort Worth" },
  { city: "Midland", state: "Texas", stateCode: "TX", population: 146038 },
  { city: "Abilene", state: "Texas", stateCode: "TX", population: 125182 },
  { city: "Beaumont", state: "Texas", stateCode: "TX", population: 117796 },
  { city: "Round Rock", state: "Texas", stateCode: "TX", population: 133372, metro: "Austin" },
  { city: "Odessa", state: "Texas", stateCode: "TX", population: 118918 },
  { city: "Wichita Falls", state: "Texas", stateCode: "TX", population: 102316 },
  { city: "Richardson", state: "Texas", stateCode: "TX", population: 121323, metro: "Dallas-Fort Worth" },
  { city: "Lewisville", state: "Texas", stateCode: "TX", population: 111822, metro: "Dallas-Fort Worth" },
  { city: "Tyler", state: "Texas", stateCode: "TX", population: 107405 },
  { city: "College Station", state: "Texas", stateCode: "TX", population: 120511 },
  { city: "Pearland", state: "Texas", stateCode: "TX", population: 125817, metro: "Houston" },
  
  // Utah
  { city: "Salt Lake City", state: "Utah", stateCode: "UT", population: 200567, metro: "Salt Lake City" },
  { city: "West Valley City", state: "Utah", stateCode: "UT", population: 140230, metro: "Salt Lake City" },
  { city: "Provo", state: "Utah", stateCode: "UT", population: 115162, metro: "Salt Lake City" },
  { city: "West Jordan", state: "Utah", stateCode: "UT", population: 116961, metro: "Salt Lake City" },
  
  // Virginia
  { city: "Virginia Beach", state: "Virginia", stateCode: "VA", population: 459470 },
  { city: "Norfolk", state: "Virginia", stateCode: "VA", population: 238005 },
  { city: "Chesapeake", state: "Virginia", stateCode: "VA", population: 249422 },
  { city: "Richmond", state: "Virginia", stateCode: "VA", population: 230436 },
  { city: "Newport News", state: "Virginia", stateCode: "VA", population: 179225 },
  { city: "Alexandria", state: "Virginia", stateCode: "VA", population: 159467 },
  { city: "Hampton", state: "Virginia", stateCode: "VA", population: 135169 },
  
  // Washington
  { city: "Seattle", state: "Washington", stateCode: "WA", population: 753675, metro: "Seattle" },
  { city: "Spokane", state: "Washington", stateCode: "WA", population: 228989 },
  { city: "Tacoma", state: "Washington", stateCode: "WA", population: 219346, metro: "Seattle" },
  { city: "Vancouver", state: "Washington", stateCode: "WA", population: 190915, metro: "Portland" },
  { city: "Bellevue", state: "Washington", stateCode: "WA", population: 148164, metro: "Seattle" },
  { city: "Kent", state: "Washington", stateCode: "WA", population: 136588, metro: "Seattle" },
  { city: "Everett", state: "Washington", stateCode: "WA", population: 110629, metro: "Seattle" },
  { city: "Renton", state: "Washington", stateCode: "WA", population: 106785, metro: "Seattle" },
  { city: "Spokane Valley", state: "Washington", stateCode: "WA", population: 102976 },
  
  // Wisconsin
  { city: "Milwaukee", state: "Wisconsin", stateCode: "WI", population: 577222, metro: "Milwaukee" },
  { city: "Madison", state: "Wisconsin", stateCode: "WI", population: 269840, metro: "Madison" },
  { city: "Green Bay", state: "Wisconsin", stateCode: "WI", population: 105207 },
];

// Format population for display
export function formatPopulation(population: number): string {
  if (population >= 1000000) {
    return `${(population / 1000000).toFixed(1)}M`;
  }
  if (population >= 1000) {
    return `${Math.round(population / 1000)}K`;
  }
  return population.toString();
}

// Get full location string
export function getLocationString(city: City): string {
  return `${city.city}, ${city.stateCode}`;
}

// Get location with market size
export function getLocationWithMarketSize(city: City): string {
  return `${city.city}, ${city.stateCode} • ${formatPopulation(city.population)} people`;
}
