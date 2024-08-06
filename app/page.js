"use client"
import Image from "next/image";
import { OpenAI } from 'openai';
import { Camera } from "react-camera-pro";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useState, useEffect, useRef } from "react";
import { firestore, googleProvider, signInWithPopup, signOut, storage } from "@/firebase";
import { Box, Modal, Typography, Grid, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, AppBar, Toolbar, IconButton, Drawer, List, ListItem, ListItemText, ListItemIcon, Divider, Container, Avatar } from "@mui/material";
import { collection, deleteDoc, doc, getDocs, query, getDoc, setDoc, writeBatch } from "firebase/firestore";
// user ID
import { auth, handleSignIn, handleSignOut } from '@/firebase';
import { onAuthStateChanged } from 'firebase/auth';
// Material UI icons 
import MenuIcon from '@mui/icons-material/Menu';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import SearchIcon from '@mui/icons-material/Search';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import GoogleIcon from "@mui/icons-material/Google";
import { createTheme, ThemeProvider, useTheme } from '@mui/material/styles';

const style = {
  position: 'absolute',
  top: '50%',
  left: '50%',
  transform: 'translate(-50%, -50%)',
  width: 400,
  bgcolor: 'background.paper',
  color: "text.primary",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
};

export default function Home() {
  // Variables 
  const [inventory, setInventory] = useState([])
  const [open, setOpen] = useState(false)
  const [itemName, setItemName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [cameraOpen, setCameraOpen] = useState(false)
  const [capturedImage, setCapturedImage] = useState(null)
  const camera = useRef(null)
  const [editOpen, setEditOpen] = useState(false)
  const [editItem, setEditItem] = useState({name: "", quantity: 0})
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)
  const [removeConfirmOpen, setRemoveConfirmOpen] = useState(false)
  const [itemToRemove, setItemToRemove] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [recipe, setRecipe] = useState("");
  const [isDarkMode, setIsDarkMode] = useState(false);
  const theme = useTheme();

  {/* Backend Functionalities */}
  const updateInventory = async () => {
    try {
      if (auth.currentUser) {
        const userUID = auth.currentUser.uid;
        
        const snapshot = await getDocs(query(collection(firestore, `inventory_${userUID}`)));
        const inventoryList = snapshot.docs.map(doc => ({
          name: doc.id,
          ...doc.data()
        }));
        
        console.log("Fetched inventory:", inventoryList); // For debugging
        setInventory(inventoryList);
      } else {
        console.log("No user signed in");
        setInventory([]); // Clear inventory if no user is signed in
      }
    } catch (error) {
      console.error("Error updating inventory:", error);
      // Optionally, set an error state or show a notification to the user
    }
  };

  useEffect(() => {
    updateInventory()
  }, [])

  const filteredInventory = inventory.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItem = async (item, imageFile = null) => {
    if (auth.currentUser){
    
    const userUID = auth.currentUser.uid;
    const docRef = doc(collection(firestore, `inventory_${userUID}`), item);
    const docSnap = await getDoc(docRef);
  
    let imageUrl = null;
  
    if (docSnap.exists()) {
      const { quantity, imageUrl: existingImage} = docSnap.data();
      await setDoc(docRef, {
        quantity: quantity + 1,
        imageUrl: imageFile || existingImage
      });
    } else {
      await setDoc(docRef, {
        quantity: 1,
        imageUrl: imageFile
      });
    }
    await updateInventory();
    }
  };

  const updateExistingItems = async () => {
    if (auth.currentUser){
    
    const userUID = auth.currentUser.uid;
    const snapshot = await getDocs(collection(firestore, `inventory_${userUID}`));
    const batch = writeBatch(firestore);
    
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (!data.hasOwnProperty('imageUrl')) {
        batch.update(doc.ref, { imageUrl: null });
      }
    });  
    await batch.commit();
    }
  };

  useEffect(() => {
    updateExistingItems()
  }, [])

  const handleCameraOpen = () => setCameraOpen(true)
  const handleCameraClose = () => setCameraOpen(false)

  const captureImage = () => {
    const imageSrc = camera.current.takePhoto();
    console.log("Image captured,", imageSrc);
    setCapturedImage(imageSrc);
    handleCameraClose();
  };

  const handleAddItem = async () => {
    if (itemName) {
      let imageFile = null;
      if (capturedImage) {
        imageFile = capturedImage
      }
      await addItem(itemName, imageFile);
      setCapturedImage(null);
      setItemName("");
      handleClose();
    }
  };

  const removeItem = async (item) => {
    if (auth.currentUser) {
      const userUID = auth.currentUser.uid;
      const docRef = doc(collection(firestore, `inventory_${userUID}`), item);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const { quantity, imageUrl } = docSnap.data();
        if (quantity === 1) {
          setItemToRemove(item);
          setRemoveConfirmOpen(true);
        } else {
          await setDoc(docRef, { quantity: quantity - 1, imageUrl }, { merge: true });
          // Update the local state immediately
          setInventory(prevInventory => 
            prevInventory.map(invItem => 
              invItem.name === item ? {...invItem, quantity: quantity - 1} : invItem
            )
          );
        }
      }
    }
  };

  const handleRemoveConfirm = async () => {
    if (itemToRemove && auth.currentUser) {
      const userUID = auth.currentUser.uid;
      const docRef = doc(collection(firestore, `inventory_${userUID}`), itemToRemove);
      await deleteDoc(docRef);
      // Update the local state immediately
      setInventory(prevInventory => prevInventory.filter(item => item.name !== itemToRemove));
      setRemoveConfirmOpen(false);
      setItemToRemove(null);
    }
  };

  const handleRemoveCancel = () => {
    setRemoveConfirmOpen(false);
    setItemToRemove(null);
  };

  const handleOpen = () => setOpen(true)
  const handleClose = () => setOpen(false)

  const handleEditOpen = (item) => {
    setEditItem(item)
    setEditOpen(true)
  };

  const handleEditClose = () => {
    setEditOpen(false)
    setEditItem({name: "", quantity: 0})
  };

  const handleEditSave = async () => {
    if (auth.currentUser) {
      const userUID = auth.currentUser.uid;
      const oldDocRef = doc(collection(firestore, `inventory_${userUID}`), editItem.name);
      const newDocRef = doc(collection(firestore, `inventory_${userUID}`), editItem.newName || editItem.name);
  
      if (editItem.newName && editItem.newName !== editItem.name) {
        await deleteDoc(oldDocRef);
        await setDoc(newDocRef, {
          quantity: editItem.quantity,
          imageUrl: editItem.imageUrl
        });
      } else {
        await setDoc(oldDocRef, {
          quantity: editItem.quantity,
          imageUrl: editItem.imageUrl
        }, { merge: true });
      }
  
      // Update the local state immediately
      setInventory(prevInventory => {
        const updatedInventory = prevInventory.filter(item => item.name !== editItem.name);
        updatedInventory.push({
          name: editItem.newName || editItem.name,
          quantity: editItem.quantity,
          imageUrl: editItem.imageUrl
        });
        return updatedInventory;
      });
  
      handleEditClose();
    }
  };

  const openDeleteConfirm = (item) => {
    setItemToDelete(item);
    setDeleteConfirmOpen(true);
  };

  const handleDelete = async () => {
    if (itemToDelete && auth.currentUser) {
      const userUID = auth.currentUser.uid;
      const docRef = doc(collection(firestore, `inventory_${userUID}`), itemToDelete);
      await deleteDoc(docRef);
      // Update the local state immediately
      setInventory(prevInventory => prevInventory.filter(item => item.name !== itemToDelete));
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
    }
  };

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleGetRecipe = async () => {
    const ingredients = inventory.map(item => item.name);
    const suggestion = await getRecipeSuggestion(ingredients);
    setRecipe(suggestion);
  };

  const lightTheme = createTheme({
    palette: {
      mode: "light"
    },
  });

  const darkTheme = createTheme({
    palette: {
      mode: "dark",
    },
  });

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      console.log("User signed in:", user);
    }
    catch (error) {
      console.error("Error signing in:", error);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("User signed out");
    }
    catch (error) {
      console.error("Error signing out:", error);
    }
  }
  // user ID
  const [user, setUser] = useState(null);
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) =>
    {
      if (user) {
        setUser(user);
        updateInventory();
      } else{
        setUser(null);
        setInventory([]);
      }
    })
    return () => unsubscribe();
  }, [])

  // OpenAI Recipe Generator 
  async function getRecipeSuggestion(ingredients) {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are a helpful assistant that suggests recipes based on available ingredients."
          },
          {
            role: "user",
            content: `I have the following ingredients: ${ingredients.join(', ')}. Can you suggest a recipe I can make with some or all of these ingredients?`
          }
        ],
        max_tokens: 150
      });
  
      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error getting recipe suggestion:', error);
      return "Sorry, I couldn't generate a recipe suggestion at this time.";
    }
  }

  const openai = new OpenAI({
    apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, 
    dangerouslyAllowBrowser: true
  });

  const parseRecipe = (recipeText) => {
    const [title, ...rest] = recipeText.split('###');
    const ingredients = rest[1]?.split('-').filter(item => item.trim()) || [];
    const instructions = rest[2]?.split(/\d+\./).filter(item => item.trim()) || [];
    
    return { title: title.trim(), ingredients, instructions };
  };

  {/* FrontEnd UI design */}
  return (
    <ThemeProvider theme={isDarkMode ? darkTheme : lightTheme}>
    <Box sx={{ flexGrow: 1, bgcolor: 'background.default', minHeight: '100vh' }}>
      
      <AppBar position="static" elevation={0} sx={{ bgcolor: 'background.paper' }}>
        <Toolbar>
          <IconButton edge="start" color="inherit" aria-label="menu" onClick={handleDrawerToggle} sx={{ mr: 2, color: 'text.primary' }}>
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, color: 'text.primary' }}>
            Jack&apos;s Pantry Buddy
          </Typography>
          <Button color="primary" variant="contained" onClick={handleOpen} startIcon={<AddIcon />}>
            Add Item
          </Button>
          {user ? (
            <Box sx={{ display: 'flex', alignItems: 'center', ml: 2 }}>
              <Avatar src={user.photoURL} alt={user.displayName} sx={{ mr: 1 }} />
              <Typography variant="subtitle1" sx={{ mr: 2, color: 'text.primary' }}>
                {user.displayName}
              </Typography>
              <Button 
                color="primary" 
                variant="outlined" 
                onClick={handleSignOut}
                sx={{ color: 'text.primary', borderColor: 'text.primary' }}
              >
                Sign Out
              </Button>
            </Box>
          ) : (
            <Button 
              color="primary" 
              variant="contained" 
              onClick={handleSignIn}
              startIcon={<GoogleIcon />}
              sx={{ ml: 2 }}
            >
              Sign In with Google
            </Button>
          )}
          <IconButton color="inherit" onClick={toggleTheme} sx={{ color: "text.primary", ml: 2 }}>
            {isDarkMode ? <Brightness7Icon/> : <Brightness4Icon/>}
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={handleDrawerToggle}
        PaperProps={{
          sx: { width: 250, bgcolor: 'background.default' }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2, color: 'text.primary' }}>
            Menu
          </Typography>
          <Divider />
          <List>
            <ListItem button onClick={handleGetRecipe} sx={{ '&:hover': { bgcolor: 'action.hover' } }}>
              <ListItemIcon>
                <RestaurantIcon color="primary" />
              </ListItemIcon>
              <ListItemText primary="Get Recipe Suggestion" primaryTypographyProps={{ color: 'text.primary' }} />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      <Container maxWidth="lg" sx={{ mt: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ color: 'text.primary', fontWeight: 'medium' }}>
          Pantry Items
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'flex-end', mb: 3 }}>
          <SearchIcon sx={{ color: 'action.active', mr: 1, my: 0.5 }} />
          <TextField
            fullWidth
            variant="standard"
            label="Search Items"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </Box>
        
        <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'background.default' }}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Image</TableCell>
                <TableCell>Item Name</TableCell>
                <TableCell align="right">Quantity</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInventory.map(({name, quantity, imageUrl}) => (
                <TableRow key={name}>
                  <TableCell>
                    {imageUrl && (
                      <img src={imageUrl} alt={name} style={{ width: "50px", height: "50px", objectFit: "cover", borderRadius: "4px" }}/>
                    )}
                  </TableCell>
                  <TableCell>{name.charAt(0).toUpperCase() + name.slice(1)}</TableCell>
                  <TableCell align="right">{quantity}</TableCell>
                  <TableCell align="right">
                    <IconButton onClick={() => addItem(name)} color="primary" size="small">
                      <AddIcon />
                    </IconButton>
                    <IconButton onClick={() => removeItem(name)} color="secondary" size="small">
                      <RemoveIcon />
                    </IconButton>
                    <IconButton onClick={() => handleEditOpen({name, quantity, imageUrl})} color="default" size="small">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => openDeleteConfirm(name)} color="error" size="small">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Container>

      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={{...style, borderRadius: 2}}>
          <Typography id="modal-modal-title" variant="h6" component="h2" color="text.primary">
            Add Item
          </Typography>
          <TextField
            id="outlined-basic"
            label="Item"
            variant="outlined"
            fullWidth
            value={itemName}
            onChange={(e) => setItemName(e.target.value)}
            InputLabelProps={{
              style: { color: "text.secondary"},
            }}
            InputProps={{
              style: { color: "text.primary" },
            }}
          />
          <Button
            variant="outlined"
            onClick={handleCameraOpen}
            startIcon={<CameraAltIcon />}
          >
            Take Photo
          </Button>
          {capturedImage && (
            <Box mt={2}>
              <img src={capturedImage} alt="Captured item" style={{width: "100%", borderRadius: "4px"}}/>
            </Box>
          )}
          <Button
            variant="contained"
            onClick={handleAddItem}
            disabled={!itemName}
          >
            Add Item
          </Button>
        </Box>
      </Modal>

      <Modal
        open={editOpen}
        onClose={handleEditClose}
        aria-labelledby="edit-modal-title"
        aria-describedby="edit-modal-description"
      >
        <Box sx={{...style, borderRadius: 2}}>
          <Typography id="edit-modal-title" variant="h6" component="h2" color="text.primary">
            Edit Item
          </Typography>
          <TextField
            label="Item Name"
            variant="outlined"
            fullWidth
            value={editItem.newName || editItem.name}
            onChange={(e) => setEditItem({...editItem, newName: e.target.value})}
            InputLabelProps={{
              style: { color: 'text.secondary' },
            }}
            InputProps={{
              style: { color: 'text.primary' },
            }}
          />
          <TextField
            label="Quantity"
            variant="outlined"
            fullWidth
            type="number"
            value={editItem.quantity}
            onChange={(e) => setEditItem({...editItem, quantity: parseInt(e.target.value)})}
            InputLabelProps={{
              style: { color: 'text.secondary' },
            }}
            InputProps={{
              style: { color: 'text.primary' },
            }}
          />
          <Button
            variant="contained"
            onClick={handleEditSave}>
              Save Changes
          </Button>
        </Box>
      </Modal>

      <Modal
        open={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-description"
      >
        <Box sx={{...style, borderRadius: 2}}>
          <Typography id="delete-confirm-title" variant="h6" component="h2" color="text.primary">
            Confirm Deletion
          </Typography>
          <Typography id="delete-confirm-description" sx={{ mt: 2 }} color="text.primary">
            Are you sure you want to delete {itemToDelete}?
          </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={() => setDeleteConfirmOpen(false)} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleDelete} variant="contained" color="error">
              Delete
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal
        open={removeConfirmOpen}
        onClose={() => setRemoveConfirmOpen(false)}
        aria-labelledby="remove-confirm-title"
        aria-describedby="remove-confirm-description"
      >
        <Box sx={{...style, borderRadius: 2}}>
          <Typography id="remove-confirm-title" variant="h6" component="h2" color="text.primary">
            Confirm Removal
          </Typography>
          <Typography id="remove-confirm-description" sx={{ mt: 2 }} color="text.primary">
            The quantity of {itemToRemove} will reach 0. Do you want to remove it completely?
            </Typography>
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
            <Button onClick={handleRemoveCancel} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleRemoveConfirm} variant="contained" color="error">
              Remove
            </Button>
          </Box>
        </Box>
      </Modal>

      <Modal
        open={!!recipe}
        onClose={() => setRecipe("")}
        aria-labelledby="recipe-modal-title"
        aria-describedby="recipe-modal-description"
      >
                  <Paper
            elevation={24}
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '90%',
              maxWidth: 800,
              maxHeight: '90vh',
              overflow: 'auto',
              bgcolor: 'background.paper',
              borderRadius: 2,
              p: 4,
              outline: 'none',
            }}
          >
            <IconButton
              aria-label="close"
              onClick={() => setRecipe("")}
              sx={{
                position: 'absolute',
                right: 8,
                top: 8,
                color: (theme) => theme.palette.grey[500],
              }}
            >
              <CloseIcon />
            </IconButton>

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <RestaurantIcon sx={{ fontSize: 40, mr: 2, color: theme.palette.primary.main }} />
              <Typography id="recipe-modal-title" variant="h4" component="h2">
                Recipe Suggestion
              </Typography>
            </Box>

            {recipe && (
              <>
                <Typography variant="h5" gutterBottom color="primary">
                  {parseRecipe(recipe).title}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={4}>
                  <Grid item xs={12} md={5}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Ingredients
                    </Typography>
                    <List>
                      {parseRecipe(recipe).ingredients.map((ingredient, index) => (
                        <ListItem key={index} disablePadding>
                          <ListItemIcon>
                            <CheckCircleOutlineIcon color="primary" />
                          </ListItemIcon>
                          <ListItemText primary={ingredient.trim()} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                  <Grid item xs={12} md={7}>
                    <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                      Instructions
                    </Typography>
                    <List>
                      {parseRecipe(recipe).instructions.map((instruction, index) => (
                        <ListItem key={index} alignItems="flex-start">
                          <ListItemIcon>
                            <Typography variant="h6" color="primary">{index + 1}.</Typography>
                          </ListItemIcon>
                          <ListItemText primary={instruction.trim()} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </>
            )}
          </Paper>
        </Modal>

      <Modal open={cameraOpen} onClose={handleCameraClose}>
        <Box sx={{...style, borderRadius: 2}}>
          <Camera ref={camera} aspectRatio={16/9}/>
          <Button variant="contained" onClick={captureImage}>
            Capture Image
          </Button>
        </Box>
      </Modal>
    </Box>
    </ThemeProvider>
  )
}