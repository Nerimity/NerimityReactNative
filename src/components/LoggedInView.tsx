import { observer } from "mobx-react-lite";
import { Button, Image, Pressable, ScrollView, Text, TouchableNativeFeedback, TouchableOpacity, View } from "react-native";
import { useStore } from "../store/store";
import { Server } from "../store/servers";

export default function LoggedInView() {
    return (
        <View style={{ flexDirection: 'row', height: "100%" }}>
            <View>
                <ServerListPane />
            </View>
            <Text>Test</Text>
        </View>
    )
}

const ServerListPane = observer(() => {
    const { servers } = useStore();
    return (
        <ScrollView showsVerticalScrollIndicator={false} style={{ backgroundColor: 'black', height: "100%" }}>
            {servers.array.map(server => <ServerItem server={server} key={server.id} />)}
        </ScrollView>
    )
})

const ServerItem = (props: { server: Server }) => {
    return (
        <View style={{ alignSelf: 'flex-start', overflow: "hidden", borderRadius: 30 }}>
            <Pressable android_ripple={{ color: 'gray' }}>
                <Avatar size={50} server={props.server} />
            </Pressable>
        </View>
    )
}



interface AvatarProps {
    server?: { avatar?: string; avatarUrl: string, hexColor: string },
    user?: { avatar?: string; avatarUrl: string, hexColor: string },
    size: number
}
const Avatar = (props: AvatarProps) => {
    const serverOrUser = props.server || props.user;

    return (
        <View style={{ width: props.size, height: props.size, margin: 10, borderRadius: props.size, overflow: 'hidden', flexShrink: 0, backgroundColor: serverOrUser?.avatar ? undefined : serverOrUser?.hexColor }}>
            {!!serverOrUser?.avatar && <Image source={{ uri: serverOrUser.avatarUrl, width: props.size, height: props.size }} />}
        </View>
    )
}
